package database

import "context"

func (p *PostgresDB) InstanceStats(ctx context.Context) (InstanceStats, error) {
	stats := InstanceStats{}
	tenantID := tenantIDForContext(ctx)

	if err := p.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users WHERE tenant_id = $1`, tenantID).Scan(&stats.Users); err != nil {
		return InstanceStats{}, err
	}
	if err := p.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM repositories WHERE tenant_id = $1`, tenantID).Scan(&stats.Repositories); err != nil {
		return InstanceStats{}, err
	}
	if err := p.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM repositories WHERE tenant_id = $1 AND is_private = FALSE`, tenantID).Scan(&stats.PublicRepositories); err != nil {
		return InstanceStats{}, err
	}
	if err := p.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM repositories WHERE tenant_id = $1 AND is_private = TRUE`, tenantID).Scan(&stats.PrivateRepositories); err != nil {
		return InstanceStats{}, err
	}
	if err := p.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM orgs WHERE tenant_id = $1`, tenantID).Scan(&stats.Organizations); err != nil {
		return InstanceStats{}, err
	}
	return stats, nil
}
