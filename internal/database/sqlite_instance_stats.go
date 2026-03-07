package database

import "context"

func (s *SQLiteDB) InstanceStats(ctx context.Context) (InstanceStats, error) {
	stats := InstanceStats{}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&stats.Users); err != nil {
		return InstanceStats{}, err
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM repositories`).Scan(&stats.Repositories); err != nil {
		return InstanceStats{}, err
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM repositories WHERE is_private = 0`).Scan(&stats.PublicRepositories); err != nil {
		return InstanceStats{}, err
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM repositories WHERE is_private = 1`).Scan(&stats.PrivateRepositories); err != nil {
		return InstanceStats{}, err
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM orgs`).Scan(&stats.Organizations); err != nil {
		return InstanceStats{}, err
	}
	return stats, nil
}
