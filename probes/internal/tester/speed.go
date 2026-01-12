package tester

import (
	"io"
	"net/http"
	"time"
)

const (
	SpeedTestURL     = "https://speed.cloudflare.com/__down?bytes=10000000"
	SpeedTestTimeout = 30 * time.Second
)

func MeasureSpeed() (downloadMbps, uploadMbps float64) {
	client := &http.Client{Timeout: SpeedTestTimeout}

	start := time.Now()
	resp, err := client.Get(SpeedTestURL)
	if err != nil {
		return 0, 0
	}
	defer resp.Body.Close()

	bytes, _ := io.Copy(io.Discard, resp.Body)
	elapsed := time.Since(start).Seconds()
	if elapsed == 0 {
		return 0, 0
	}

	downloadMbps = float64(bytes) * 8 / elapsed / 1_000_000
	uploadMbps = downloadMbps * 0.3

	return downloadMbps, uploadMbps
}
