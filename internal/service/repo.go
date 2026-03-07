package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/odvcencio/graft/pkg/object"
	"github.com/odvcencio/orchard/internal/database"
	"github.com/odvcencio/orchard/internal/graftstore"
	"github.com/odvcencio/orchard/internal/models"
)

var validRepoName = regexp.MustCompile(`^[a-zA-Z0-9._-]+$`)

type RepoService struct {
	db              database.DB
	storagePath     string // root path for all repo storage
	copyDirectoryFn func(src, dst string) error
}

func NewRepoService(db database.DB, storagePath string) *RepoService {
	return &RepoService{
		db:              db,
		storagePath:     storagePath,
		copyDirectoryFn: copyDirectory,
	}
}

func (s *RepoService) StoragePath() string {
	return s.storagePath
}

func (s *RepoService) Create(ctx context.Context, ownerID int64, name, description string, isPrivate bool, initializeWithReadme ...bool) (*models.Repository, error) {
	if !validRepoName.MatchString(name) {
		return nil, fmt.Errorf("invalid repository name: %q", name)
	}

	repo := &models.Repository{
		OwnerUserID:   &ownerID,
		Name:          name,
		Description:   description,
		DefaultBranch: "main",
		IsPrivate:     isPrivate,
	}

	// Storage path will be set after we have the ID, but we need a temp path for creation
	repo.StoragePath = "pending"
	if err := s.db.CreateRepository(ctx, repo); err != nil {
		return nil, fmt.Errorf("create repo: %w", err)
	}

	// Set the real storage path using the repo ID
	repo.StoragePath = s.storagePathForNewRepo(ctx, repo.ID)

	// Initialize the bare repository store
	if _, err := gotstore.Open(repo.StoragePath); err != nil {
		return nil, fmt.Errorf("init repo store: %w", err)
	}

	if err := s.db.UpdateRepositoryStoragePath(ctx, repo.ID, repo.StoragePath); err != nil {
		return nil, fmt.Errorf("persist storage path: %w", err)
	}
	if len(initializeWithReadme) > 0 && initializeWithReadme[0] {
		author, err := s.initialCommitAuthor(ctx, ownerID)
		if err != nil {
			return nil, fmt.Errorf("resolve author: %w", err)
		}
		if err := s.initializeWithReadme(ctx, repo, author); err != nil {
			return nil, fmt.Errorf("initialize readme: %w", err)
		}
	}

	return repo, nil
}

func (s *RepoService) initialCommitAuthor(ctx context.Context, ownerID int64) (string, error) {
	user, err := s.db.GetUserByID(ctx, ownerID)
	if err != nil {
		return "", err
	}
	if user == nil {
		return "orchard <noreply@orchard.dev>", nil
	}
	username := strings.TrimSpace(user.Username)
	if username == "" {
		username = "orchard"
	}
	email := strings.TrimSpace(user.Email)
	if email == "" {
		email = "noreply@orchard.dev"
	}
	return fmt.Sprintf("%s <%s>", username, email), nil
}

func (s *RepoService) initializeWithReadme(ctx context.Context, repo *models.Repository, author string) error {
	store, err := gotstore.Open(repo.StoragePath)
	if err != nil {
		return fmt.Errorf("open repo store: %w", err)
	}
	description := strings.TrimSpace(repo.Description)
	readme := "# " + repo.Name + "\n\n"
	if description != "" {
		readme += description + "\n"
	}
	blobHash, err := store.Objects.WriteBlob(&object.Blob{Data: []byte(readme)})
	if err != nil {
		return fmt.Errorf("write readme blob: %w", err)
	}
	tree := &object.TreeObj{
		Entries: []object.TreeEntry{
			{
				Name:     "README.md",
				Mode:     object.TreeModeFile,
				BlobHash: blobHash,
			},
		},
	}
	treeHash, err := store.Objects.WriteTree(tree)
	if err != nil {
		return fmt.Errorf("write readme tree: %w", err)
	}
	now := time.Now().UTC().Unix()
	commit := &object.CommitObj{
		TreeHash:           treeHash,
		Author:             author,
		Timestamp:          now,
		AuthorTimezone:     "+0000",
		Committer:          author,
		CommitterTimestamp: now,
		CommitterTimezone:  "+0000",
		Message:            "Initial commit",
	}
	commitHash, err := store.Objects.WriteCommit(commit)
	if err != nil {
		return fmt.Errorf("write initial commit: %w", err)
	}
	defaultBranch := strings.TrimSpace(repo.DefaultBranch)
	if defaultBranch == "" {
		defaultBranch = "main"
	}
	if err := store.Refs.Set("heads/"+defaultBranch, commitHash); err != nil {
		return fmt.Errorf("set default branch ref: %w", err)
	}
	if err := s.db.SetGitTreeEntryModes(ctx, repo.ID, string(treeHash), map[string]string{
		"README.md": object.TreeModeFile,
	}); err != nil {
		return fmt.Errorf("persist readme mode: %w", err)
	}
	return nil
}

func (s *RepoService) Fork(ctx context.Context, sourceRepoID, ownerID int64, requestedName string) (*models.Repository, error) {
	sourceRepo, err := s.db.GetRepositoryByID(ctx, sourceRepoID)
	if err != nil {
		return nil, fmt.Errorf("get source repo: %w", err)
	}

	name := strings.TrimSpace(requestedName)
	if name == "" {
		name = sourceRepo.Name
	}
	if !validRepoName.MatchString(name) {
		return nil, fmt.Errorf("invalid repository name: %q", name)
	}

	owner, err := s.db.GetUserByID(ctx, ownerID)
	if err != nil {
		return nil, fmt.Errorf("get fork owner: %w", err)
	}

	availableName, err := s.pickAvailableForkName(ctx, owner.Username, name)
	if err != nil {
		return nil, err
	}

	parentRepoID := sourceRepo.ID
	fork := &models.Repository{
		OwnerUserID:   &ownerID,
		ParentRepoID:  &parentRepoID,
		Name:          availableName,
		Description:   sourceRepo.Description,
		DefaultBranch: sourceRepo.DefaultBranch,
		IsPrivate:     sourceRepo.IsPrivate,
		StoragePath:   "pending",
	}
	if err := s.db.CreateRepository(ctx, fork); err != nil {
		return nil, fmt.Errorf("create fork repo: %w", err)
	}
	failFork := func(op string, err error) (*models.Repository, error) {
		forkErr := fmt.Errorf("%s: %w", op, err)
		if rollbackErr := s.rollbackForkCreate(fork.ID, fork.StoragePath); rollbackErr != nil {
			return nil, fmt.Errorf("%w (rollback fork create: %v)", forkErr, rollbackErr)
		}
		return nil, forkErr
	}

	fork.StoragePath = s.storagePathForNewRepo(ctx, fork.ID)
	if _, err := gotstore.Open(fork.StoragePath); err != nil {
		return failFork("init fork store", err)
	}

	sourceStore, err := s.OpenStoreByID(ctx, sourceRepo.ID)
	if err != nil {
		return failFork("open source store", err)
	}

	copyDirectoryFn := s.copyDirectoryFn
	if copyDirectoryFn == nil {
		copyDirectoryFn = copyDirectory
	}

	if err := copyDirectoryFn(filepath.Join(sourceStore.Root(), "objects"), filepath.Join(fork.StoragePath, "objects")); err != nil {
		return failFork("copy objects", err)
	}
	if err := copyDirectoryFn(filepath.Join(sourceStore.Root(), "refs"), filepath.Join(fork.StoragePath, "refs")); err != nil {
		return failFork("copy refs", err)
	}
	if err := s.db.CloneRepoMetadata(ctx, sourceRepo.ID, fork.ID); err != nil {
		return failFork("clone repo metadata", err)
	}

	if err := s.db.UpdateRepositoryStoragePath(ctx, fork.ID, fork.StoragePath); err != nil {
		return failFork("persist fork storage path", err)
	}

	return fork, nil
}

func (s *RepoService) Get(ctx context.Context, owner, name string) (*models.Repository, error) {
	return s.db.GetRepository(ctx, owner, name)
}

func (s *RepoService) GetByID(ctx context.Context, id int64) (*models.Repository, error) {
	return s.db.GetRepositoryByID(ctx, id)
}

func (s *RepoService) List(ctx context.Context, userID int64) ([]models.Repository, error) {
	return s.db.ListUserRepositories(ctx, userID)
}

func (s *RepoService) ListPage(ctx context.Context, userID int64, page, perPage int) ([]models.Repository, error) {
	limit, offset := normalizePage(page, perPage, 30, 200)
	return s.db.ListUserRepositoriesPage(ctx, userID, limit, offset)
}

func (s *RepoService) ListForks(ctx context.Context, parentRepoID int64) ([]models.Repository, error) {
	return s.db.ListRepositoryForks(ctx, parentRepoID)
}

func (s *RepoService) ListForksPage(ctx context.Context, parentRepoID int64, page, perPage int) ([]models.Repository, error) {
	limit, offset := normalizePage(page, perPage, 30, 200)
	return s.db.ListRepositoryForksPage(ctx, parentRepoID, limit, offset)
}

func (s *RepoService) Delete(ctx context.Context, id int64) error {
	return s.db.DeleteRepository(ctx, id)
}

// OpenStore opens the object store for a repository.
func (s *RepoService) OpenStore(ctx context.Context, owner, name string) (*gotstore.RepoStore, error) {
	repo, err := s.db.GetRepository(ctx, owner, name)
	if err != nil {
		return nil, fmt.Errorf("repo %s/%s: %w", owner, name, err)
	}
	// Backward compatibility: older rows may still have "pending".
	if repo.StoragePath == "" || repo.StoragePath == "pending" {
		repo.StoragePath = s.resolveStoragePath(ctx, repo)
	}
	return gotstore.Open(repo.StoragePath)
}

// OpenStoreByID opens the object store for a repository by numeric ID.
func (s *RepoService) OpenStoreByID(ctx context.Context, repoID int64) (*gotstore.RepoStore, error) {
	repo, err := s.db.GetRepositoryByID(ctx, repoID)
	if err != nil {
		return nil, fmt.Errorf("repo %d: %w", repoID, err)
	}
	if repo.StoragePath == "" || repo.StoragePath == "pending" {
		repo.StoragePath = s.resolveStoragePath(ctx, repo)
	}
	return gotstore.Open(repo.StoragePath)
}

func (s *RepoService) storagePathForNewRepo(ctx context.Context, repoID int64) string {
	repoPath := filepath.Join(s.storagePath, fmt.Sprintf("%d", repoID))
	tenantID, ok := database.TenantIDFromContext(ctx)
	if !ok {
		return repoPath
	}
	return filepath.Join(s.storagePath, tenantID, fmt.Sprintf("%d", repoID))
}

func (s *RepoService) resolveStoragePath(ctx context.Context, repo *models.Repository) string {
	tenantPath := s.storagePathForNewRepo(ctx, repo.ID)
	legacyPath := filepath.Join(s.storagePath, fmt.Sprintf("%d", repo.ID))
	if tenantPath == legacyPath {
		return tenantPath
	}

	// Preserve compatibility for repositories created before tenant-scoped layout.
	if stat, err := os.Stat(legacyPath); err == nil && stat.IsDir() {
		return legacyPath
	}
	if stat, err := os.Stat(tenantPath); err == nil && stat.IsDir() {
		return tenantPath
	}
	return tenantPath
}

func (s *RepoService) pickAvailableForkName(ctx context.Context, ownerName, desired string) (string, error) {
	exists := func(name string) (bool, error) {
		_, err := s.db.GetRepository(ctx, ownerName, name)
		if err == nil {
			return true, nil
		}
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}

	ok, err := exists(desired)
	if err != nil {
		return "", fmt.Errorf("check repo name availability: %w", err)
	}
	if !ok {
		return desired, nil
	}

	for i := 1; i <= 999; i++ {
		candidate := fmt.Sprintf("%s-fork-%d", desired, i)
		ok, err := exists(candidate)
		if err != nil {
			return "", fmt.Errorf("check fork name availability: %w", err)
		}
		if !ok {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("no available fork name for base %q", desired)
}

func (s *RepoService) rollbackForkCreate(repoID int64, storagePath string) error {
	cleanupCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var rollbackErr error
	if err := s.db.DeleteRepository(cleanupCtx, repoID); err != nil && !errors.Is(err, sql.ErrNoRows) {
		rollbackErr = errors.Join(rollbackErr, fmt.Errorf("delete fork repository %d: %w", repoID, err))
	}
	if strings.TrimSpace(storagePath) != "" {
		if err := os.RemoveAll(storagePath); err != nil && !errors.Is(err, os.ErrNotExist) {
			rollbackErr = errors.Join(rollbackErr, fmt.Errorf("remove fork storage %q: %w", storagePath, err))
		}
	}
	return rollbackErr
}

func copyDirectory(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		targetPath := filepath.Join(dst, rel)
		if d.IsDir() {
			info, err := d.Info()
			if err != nil {
				return err
			}
			return os.MkdirAll(targetPath, info.Mode().Perm())
		}
		if d.Type()&os.ModeSymlink != 0 {
			return fmt.Errorf("refuse to copy symlink %q", path)
		}
		return copyFile(path, targetPath)
	})
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	info, err := in.Stat()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, info.Mode().Perm())
	if err != nil {
		return err
	}
	_, copyErr := io.Copy(out, in)
	closeErr := out.Close()
	if copyErr != nil {
		return copyErr
	}
	return closeErr
}
