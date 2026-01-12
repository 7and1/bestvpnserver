package tester

import (
	"net"
	"net/url"
	"strings"
	"time"
)

const defaultLatencyTimeout = 3 * time.Second

func MeasureLatency(targets []string) int {
	if len(targets) == 0 {
		return 0
	}

	best := time.Duration(0)
	for _, target := range targets {
		latency := measureTargetLatency(target)
		if latency == 0 {
			continue
		}
		if best == 0 || latency < best {
			best = latency
		}
	}

	return int(best.Milliseconds())
}

func measureTargetLatency(target string) time.Duration {
	host := strings.TrimSpace(target)
	if host == "" {
		return 0
	}

	if strings.HasPrefix(host, "http://") || strings.HasPrefix(host, "https://") {
		parsed, err := url.Parse(host)
		if err == nil && parsed.Host != "" {
			host = parsed.Host
		}
	}

	if !strings.Contains(host, ":") {
		host = host + ":443"
	}

	start := time.Now()
	conn, err := net.DialTimeout("tcp", host, defaultLatencyTimeout)
	if err != nil {
		return 0
	}
	_ = conn.Close()

	return time.Since(start)
}
