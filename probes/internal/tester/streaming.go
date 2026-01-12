package tester

import (
	"net/http"
	"strings"
	"time"
)

import "bestvpnserver/probe/internal/types"

var streamingEndpoints = map[string]string{
	"netflix-us":  "https://www.netflix.com/title/80018499",
	"netflix-jp":  "https://www.netflix.com/jp/title/80018499",
	"disney-plus": "https://www.disneyplus.com/",
	"hbo-max":     "https://www.max.com/",
	"bbc-iplayer": "https://www.bbc.co.uk/iplayer",
}

func CheckStreaming(platforms []string) []types.StreamingResult {
	results := make([]types.StreamingResult, 0, len(platforms))

	client := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	for _, platform := range platforms {
		url, ok := streamingEndpoints[platform]
		if !ok {
			continue
		}

		start := time.Now()
		resp, err := client.Get(url)
		elapsed := time.Since(start).Milliseconds()

		result := types.StreamingResult{
			Platform:   platform,
			ResponseMs: elapsed,
		}

		if err != nil {
			result.IsUnlocked = false
		} else {
			defer resp.Body.Close()
			result.IsUnlocked = isUnlocked(resp, platform)
		}

		results = append(results, result)
	}

	return results
}

func isUnlocked(resp *http.Response, platform string) bool {
	switch {
	case strings.HasPrefix(platform, "netflix"):
		return resp.StatusCode == 200
	case platform == "disney-plus":
		return resp.StatusCode == 200
	case platform == "bbc-iplayer":
		return resp.StatusCode == 200 && !strings.Contains(resp.Header.Get("Location"), "unavailable")
	default:
		return resp.StatusCode == 200
	}
}
