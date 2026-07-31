# Security policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's security advisory feature. Do not open a public issue containing credentials or exploit details.

## Secrets

This repository must never contain live API keys or `.env` files. Use `.env.example` for variable names and store production credentials in the hosting provider's secret manager.

If a credential is accidentally committed, revoke or rotate it immediately before cleaning the repository history.
