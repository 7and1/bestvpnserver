package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"

	"bestvpnserver/probe/internal/config"
	"bestvpnserver/probe/internal/connector"
	"bestvpnserver/probe/internal/health"
	"bestvpnserver/probe/internal/reporter"
	"bestvpnserver/probe/internal/tester"
	"bestvpnserver/probe/internal/types"
)

var errNoJob = errors.New("no job available")

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println("Shutting down...")
		cancel()
	}()

	redisClient, err := newRedisClient(cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis connection error: %v", err)
	}

	stats := &health.Stats{}
	go serveHealth(cfg.ProbeID, stats)

	for {
		select {
		case <-ctx.Done():
			return
		default:
			job, err := fetchNextJob(ctx, redisClient, cfg.ProbeID)
			if err != nil {
				if errors.Is(err, errNoJob) {
					time.Sleep(10 * time.Second)
					continue
				}
				log.Printf("job fetch failed: %v", err)
				time.Sleep(5 * time.Second)
				continue
			}

			result := runTest(ctx, cfg, job)
			if err := reporter.Send(cfg.WebhookURL, cfg.WebhookSecret, result); err != nil {
				log.Printf("reporter error: %v", err)
			}

			stats.LastTestTime = time.Now()
			stats.TestsToday += 1
		}
	}
}

func newRedisClient(redisURL string) (*redis.Client, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	return redis.NewClient(opt), nil
}

func fetchNextJob(ctx context.Context, client *redis.Client, probeID string) (*types.Job, error) {
	key := fmt.Sprintf("probe:jobs:%s", probeID)
	payload, err := client.LPop(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, errNoJob
		}
		return nil, err
	}

	var job types.Job
	if err := json.Unmarshal([]byte(payload), &job); err != nil {
		return nil, err
	}

	return &job, nil
}

func runTest(ctx context.Context, cfg *config.Config, job *types.Job) types.TestResult {
	conn, err := connector.Connect(ctx, job.Server, job.Protocol, cfg.DryRun)
	if err != nil {
		return types.TestResult{
			ServerID:          job.ServerID,
			ProbeID:           cfg.ProbeID,
			ConnectionSuccess: false,
			Error:             err.Error(),
		}
	}
	defer conn.Disconnect()

	result := types.TestResult{
		ServerID:          job.ServerID,
		ProbeID:           cfg.ProbeID,
		ConnectionSuccess: true,
		ConnectionTimeMs:  conn.ConnectionTimeMillis,
	}

	result.PingMs = tester.MeasureLatency(job.LatencyTargets)

	if job.Tier != "cold" {
		result.DownloadMbps, result.UploadMbps = tester.MeasureSpeed()
	}

	if job.Tier == "hot" {
		result.StreamingResults = tester.CheckStreaming(job.StreamingTargets)
	}

	return result
}

func serveHealth(probeID string, stats *health.Stats) {
	mux := http.NewServeMux()
	mux.Handle("/health", health.Handler(probeID, stats))

	server := &http.Server{
		Addr:              ":8080",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Printf("health server error: %v", err)
	}
}
