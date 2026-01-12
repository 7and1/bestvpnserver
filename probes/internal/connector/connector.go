package connector

import (
	"context"
	"fmt"
)

import "bestvpnserver/probe/internal/types"

type Connection struct {
	ConnectionTimeMillis int64
	DisconnectFunc       func() error
}

func (c *Connection) Disconnect() error {
	if c == nil || c.DisconnectFunc == nil {
		return nil
	}
	return c.DisconnectFunc()
}

func Connect(ctx context.Context, server types.ServerConfig, protocol string, dryRun bool) (*Connection, error) {
	switch protocol {
	case "wireguard":
		return ConnectWireGuard(ctx, server, dryRun)
	case "openvpn", "openvpn-udp", "openvpn-tcp":
		return ConnectOpenVPN(ctx, server, dryRun)
	default:
		return nil, fmt.Errorf("unsupported protocol: %s", protocol)
	}
}
