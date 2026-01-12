package types

type ServerConfig struct {
	ID               string `json:"id"`
	Hostname         string `json:"hostname"`
	IPAddress        string `json:"ip_address"`
	WireGuardConfig  string `json:"wireguard_config"`
	OpenVPNConfig    string `json:"openvpn_config"`
	OpenVPNUser      string `json:"openvpn_user"`
	OpenVPNPassword  string `json:"openvpn_password"`
	WireGuardPrivate string `json:"wireguard_private_key"`
}

type Job struct {
	ServerID         int      `json:"server_id"`
	Tier             string   `json:"tier"`
	Protocol         string   `json:"protocol"`
	LatencyTargets   []string `json:"latency_targets"`
	StreamingTargets []string `json:"streaming_targets"`
	Server           ServerConfig `json:"server"`
}

type StreamingResult struct {
	Platform   string `json:"platform"`
	IsUnlocked bool   `json:"is_unlocked"`
	ResponseMs int64  `json:"response_ms"`
}

type TestResult struct {
	ServerID         int               `json:"server_id"`
	ProbeID          string            `json:"probe_id"`
	Timestamp        int64             `json:"timestamp"`
	PingMs           int               `json:"ping_ms"`
	DownloadMbps     float64           `json:"download_mbps"`
	UploadMbps       float64           `json:"upload_mbps"`
	JitterMs         int               `json:"jitter_ms"`
	PacketLossPct    float64           `json:"packet_loss_pct"`
	ConnectionSuccess bool             `json:"connection_success"`
	ConnectionTimeMs int64             `json:"connection_time_ms"`
	StreamingResults []StreamingResult `json:"streaming_results,omitempty"`
	Error            string            `json:"error,omitempty"`
}
