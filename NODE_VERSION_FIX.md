# 🔧 Node.js Version Compatibility Fix

## Issue
Azure Functions Runtime 4.x requires Node.js 18 LTS or 20 LTS. You're currently running Node.js v25.1.0, which is not yet supported.

## Quick Fix

### Option 1: Using nvm (Recommended)

If you have nvm installed:

```bash
# Install Node.js 20 LTS
nvm install 20

# Use Node.js 20 for this project
nvm use 20

# Verify version
node --version  # Should show v20.x.x

# Now start the API
cd api
npm start
```

To automatically switch versions when entering this directory:
```bash
# We've created a .nvmrc file, so just run:
nvm use
```

### Option 2: Using n (Node Version Manager)

If you use `n`:

```bash
# Install Node.js 20 LTS
sudo n 20

# Verify
node --version

# Start API
cd api
npm start
```

### Option 3: Using Homebrew (macOS)

```bash
# Uninstall current version
brew uninstall node

# Install Node.js 20
brew install node@20

# Link it
brew link node@20

# Verify
node --version

# Start API
cd api
npm start
```

### Option 4: Download Node.js 20 LTS

Download from: https://nodejs.org/en/download/

Choose **Node.js 20 LTS** (Long Term Support)

## Verify Installation

After switching:

```bash
node --version   # Should be v20.x.x (or v18.x.x)
cd api
npm start       # Should now work!
```

## Supported Versions

Azure Functions Runtime 4.x supports:
- ✅ Node.js 18.x (LTS)
- ✅ Node.js 20.x (LTS)
- ❌ Node.js 21+ (not yet supported)
- ❌ Node.js 25 (too new)

## For Your Information

We've added:
- `api/.nvmrc` - Specifies Node.js 20 for this project
- `api/package.json` - Updated with Node.js engine requirements
- `.tool-versions` - For asdf version manager users

## Still Having Issues?

If you encounter errors after switching:

```bash
# Clean install dependencies
cd api
rm -rf node_modules package-lock.json
npm install
npm start
```

## Reference

- [Azure Functions Node.js Support](https://aka.ms/functions-node-versions)
- [nvm Documentation](https://github.com/nvm-sh/nvm)
- [Node.js Downloads](https://nodejs.org/)
