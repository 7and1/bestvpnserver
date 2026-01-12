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

func ConnectOpenVPN(ctx context.Context, server types.ServerConfig, dryRun bool) (*Connection, error) {
	if server.OpenVPNConfig == "" {
		return nil, fmt.Errorf("missing OpenVPN config for server %s", server.ID)
	}

	configPath := filepath.Join(os.TempDir(), fmt.Sprintf("ovpn-%s.ovpn", server.ID))
	if err := os.WriteFile(configPath, []byte(server.OpenVPNConfig), 0o600); err != nil {
		return nil, fmt.Errorf("write openvpn config: %w", err)
	}

	start := time.Now()
	if !dryRun {
		cmd := exec.CommandContext(ctx, "openvpn", "--config", configPath, "--daemon")
		if err := cmd.Run(); err != nil {
			return nil, fmt.Errorf("openvpn start failed: %w", err)
		}
	}

	return &Connection{
		ConnectionTimeMillis: time.Since(start).Milliseconds(),
		DisconnectFunc: func() error {
			if dryRun {
				return nil
			}
			cmd := exec.Command("pkill", "-f", configPath)
			return cmd.Run()
		},
	}, nil
}
