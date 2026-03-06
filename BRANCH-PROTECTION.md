# Branch Protection Rules

Configuration for `timfong888/filecoin-pay-console` GitHub branch rulesets.

## Setup via CLI

Run these commands once (requires `gh` CLI authenticated with admin access):

### Rule 1: Protect `main` (GA production)

```bash
gh api repos/timfong888/filecoin-pay-console/rulesets -X POST \
  --input - <<'EOF'
{
  "name": "Protect main",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "deletion"
    },
    {
      "type": "non_fast_forward"
    },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_status_checks_policy": false,
        "required_status_checks": [
          {
            "context": "Vercel – filecoin-pay-console"
          }
        ]
      }
    }
  ],
  "bypass_actors": [
    {
      "actor_id": 5,
      "actor_type": "RepositoryRole",
      "bypass_mode": "always"
    }
  ]
}
EOF
```

### Rule 2: Protect `prototype` (lighter)

```bash
gh api repos/timfong888/filecoin-pay-console/rulesets -X POST \
  --input - <<'EOF'
{
  "name": "Protect prototype",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/prototype"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "deletion"
    },
    {
      "type": "non_fast_forward"
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_status_checks_policy": false,
        "required_status_checks": [
          {
            "context": "Vercel – filecoin-pay-console"
          }
        ]
      }
    }
  ]
}
EOF
```

## What each rule does

### `main` branch
| Rule | Effect |
|------|--------|
| `pull_request` (0 approvals) | All changes must go through a PR (no direct push), but no approval required since you're solo |
| `required_status_checks` | Vercel build must pass before merge |
| `non_fast_forward` | No force pushes — protects deployment history and tags |
| `deletion` | Cannot delete the branch |
| `bypass_actors` (RepositoryRole 5 = Admin) | You can bypass in emergencies |

### `prototype` branch
| Rule | Effect |
|------|--------|
| `required_status_checks` | Vercel build must pass |
| `non_fast_forward` | No force pushes |
| `deletion` | Cannot delete the branch |
| No `pull_request` rule | Direct pushes allowed — less friction for experimentation |

## Verifying rules

```bash
# List all rulesets
gh api repos/timfong888/filecoin-pay-console/rulesets

# Check a specific ruleset (replace ID)
gh api repos/timfong888/filecoin-pay-console/rulesets/{ruleset_id}

# Delete a ruleset if needed
gh api repos/timfong888/filecoin-pay-console/rulesets/{ruleset_id} -X DELETE
```

## Notes

- The Vercel status check name may vary. After your first Vercel deployment via PR, check the exact name under Settings > Branches and update the `context` value if needed.
- `bypass_actors` with RepositoryRole ID 5 = Admin role. This lets you push directly to `main` in emergencies without going through a PR.
- These use GitHub's newer **rulesets** API (not the legacy branch protection API), which supports more granular controls and stacking multiple rules.
