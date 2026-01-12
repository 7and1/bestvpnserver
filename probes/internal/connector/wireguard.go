package connector

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

import "bestvpnserver/probe/internal/types"

func ConnectWireGuard(ctx context.Context, server types.ServerConfig, dryRun bool) (*Connection, error) {
	if server.WireGuardConfig == "" {
		return nil, fmt.Errorf("missing WireGuard config for server %s", server.ID)
	}

	configPath := filepath.Join(os.TempDir(), fmt.Sprintf("wg-%s.conf", server.ID))
	if err := os.WriteFile(configPath, []byte(server.WireGuardConfig), 0o600); err != nil {
		return nil, fmt.Errorf("write wireguard config: %w", err)
	}

	start := time.Now()
	if !dryRun {
		cmd := exec.CommandContext(ctx, "wg-quick", "up", configPath)
		if err := cmd.Run(); err != nil {
			return nil, fmt.Errorf("wg-quick up failed: %w", err)
		}
	}

	return &Connection{
		ConnectionTimeMillis: time.Since(start).Milliseconds(),
		DisconnectFunc: func() error {
			if dryRun {
				return nil
			}
			cmd := exec.Command("wg-quick", "down", configPath)
			return cmd.Run()
		},
	}, nil
}
