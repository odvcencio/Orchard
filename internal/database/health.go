package database

import "time"

// IndexingQueueStats summarizes indexing queue status for health and observability endpoints.
type IndexingQueueStats struct {
	Queued         int64
	InProgress     int64
	Failed         int64
	OldestQueuedAt *time.Time
}

// InstanceStats summarizes top-level instance counts for operational visibility.
type InstanceStats struct {
	Users               int64
	Repositories        int64
	PublicRepositories  int64
	PrivateRepositories int64
	Organizations       int64
}
