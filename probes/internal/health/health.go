package health

import (
	"encoding/json"
	"net/http"
	"time"
)

type Stats struct {
	LastTestTime time.Time
	TestsToday   int
}

type Status struct {
	Status     string    `json:"status"`
	ProbeID    string    `json:"probe_id"`
	Uptime     string    `json:"uptime"`
	LastTest   time.Time `json:"last_test"`
	TestsToday int       `json:"tests_today"`
}

func Handler(probeID string, stats *Stats) http.HandlerFunc {
	startTime := time.Now()

	return func(w http.ResponseWriter, r *http.Request) {
		status := Status{
			Status:     "healthy",
			ProbeID:    probeID,
			Uptime:     time.Since(startTime).String(),
			LastTest:   stats.LastTestTime,
			TestsToday: stats.TestsToday,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(status)
	}
}
