# ✅ Setup GitHub Action to Publish to EAS

## 🔐 1. Create Expo Access Token

- [ ] Run `npx eas whoami` to make sure you're logged in to Expo
- [ ] Generate a token: `npx eas token`
- [ ] Go to your GitHub repo → Settings → Secrets and variables → Actions → Add new repository secret:
  - Name: `EXPO_TOKEN`
  - Value: (Paste the token here)

## 🛠️ 2. Create GitHub Action Workflow

- [ ] In your project, create the directory `.github/workflows` if it doesn't exist
- [ ] Inside it, create a file named `eas-publish.yml`
- [ ] Paste the following into the file:

```yaml
name: EAS Publish

on:
  push:
    branches:
      - 'feature/**'
      - 'preview/**'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install EAS CLI
        run: npm install -g eas-cli

      - name: Log in to Expo
        run: eas whoami || echo "// no login needed with token"

      - name: Publish to EAS Update
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
        run: |
          BRANCH_NAME=$(echo "${GITHUB_REF##*/}" | tr / -)
          eas update --branch $BRANCH_NAME --message "Auto-publish from $BRANCH_NAME"
```

## 📲 3. Access Published Builds

- [ ] Each push to a `feature/*` or `preview/*` branch will auto-publish to a matching EAS Update branch
- [ ] You can load a specific update in a custom dev client or published app using the branch name
- [ ] To preview it live: run `npx expo start --dev-client` locally with the right branch name, or set up a QR-based test flow using Expo Updates + EAS Update channels

## 🧪 Optional

- [ ] Add Slack or Discord notifications
- [ ] Promote an update from a feature branch to production via `eas update:branch`

