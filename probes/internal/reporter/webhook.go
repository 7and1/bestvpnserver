package reporter

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

import "bestvpnserver/probe/internal/types"

func Send(webhookURL, secret string, result types.TestResult) error {
	result.Timestamp = time.Now().UnixMilli()

	payload, err := json.Marshal(result)
	if err != nil {
		return err
	}

	signature := sign(payload, secret)

	req, err := http.NewRequest("POST", webhookURL, bytes.NewBuffer(payload))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Probe-Signature", signature)
	req.Header.Set("X-Probe-ID", result.ProbeID)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("webhook failed: %d", resp.StatusCode)
	}

	return nil
}

func sign(payload []byte, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payload)
	return hex.EncodeToString(h.Sum(nil))
}
