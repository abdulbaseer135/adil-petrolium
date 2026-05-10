## Description
<!-- Please include a summary of the change and why it was made. -->

## Type
<!-- Select one: feat / fix / chore / docs / test / refactor / security -->
- [ ] Feature (new functionality)
- [ ] Bug fix
- [ ] Security improvement
- [ ] Documentation
- [ ] Test coverage
- [ ] Refactoring

## Changes
<!-- List specific changes made -->
- Change 1
- Change 2
- Change 3

## Testing
<!-- Describe how you tested the changes. -->

**Frontend tests (if applicable)**:
```bash
cd frontend && npm test -- --watchAll=false
```
- [ ] All tests pass locally
- [ ] Security test passes (no localStorage/sessionStorage, no dangerouslySetInnerHTML)

**Backend tests (if applicable)**:
```bash
cd backend && npm test -- --watchAll=false
```
- [ ] All tests pass locally
- [ ] Integration tests pass (requires MongoDB on localhost:27017)

**Manual testing (if applicable)**:
- [ ] Tested in browser (describe steps)
- [ ] Tested with curl/Postman (describe endpoint)

## Security Checklist
- [ ] No secrets committed (`.env` not in diff, use `.env.example`)
- [ ] No `localStorage`/`sessionStorage` for tokens
- [ ] No `dangerouslySetInnerHTML` without review
- [ ] API endpoints use `authenticate` + `authorize` middlewares
- [ ] User input is sanitized/validated server-side
- [ ] CSRF token is used for state-changing requests

## Documentation
- [ ] Updated relevant docs (README, CONTRIBUTING, comments)
- [ ] Added/updated tests with descriptive names
- [ ] If API changed, frontend can consume it

## Related Issues
<!-- Link related issues: Closes #123, Related to #456 -->
Closes #

## Additional Notes
<!-- Any additional context or concerns? -->
