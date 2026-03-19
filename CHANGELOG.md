# Changelog

## 1.2.1

### Added

- `SHOW_ERROR_LOGS` static property on `ErrorObjectFromPayload` to control detailed console.log output during error
  building (default: `true`)
- `verboseLog()` method on `ErrorObjectFromPayload` — the base `ErrorObject` removed it in 1.2.1, but it's still useful
  here for logging `nextErrors`

### Changed

- Updated `@smbcheeky/error-object` dependency to `1.2.1`
- `toVerboseString()` no longer duplicates `raw` — since `toDebugString()` now includes it via `toJSON()`, verbose mode
  only appends `nextErrors` when present
- `SHOW_ERROR_LOGS` logs now use `[ErrorObjectFromPayload]` prefix instead of `[ErrorObject]`
- Playground sets `ErrorObject.INCLUDE_DOMAIN_IN_STRING = true` to preserve domain/code format in `toString()`
- Updated playground output comments to reflect the new `[DEBUG]` prefix format from ErrorObject 1.2.1

## 1.2.0

### Changed

- Updated `@smbcheeky/error-object` dependency to `1.2.0`
- Renamed static constant references: `DEFAULT_GENERIC_CODE` → `GENERIC_CODE`, `DEFAULT_GENERIC_MESSAGE` →
  `GENERIC_MESSAGE`, `DEFAULT_GENERIC_TAG` → `GENERIC_TAG`
- `_log()` now uses `ErrorObject.LOG_METHOD` instead of `console.log` directly, respecting the configurable log method

## 1.1.9

### Changed

- Moved all builder logic (`ErrorObjectFromPayload`, build options, path resolution, transform pipeline) from
  `@smbcheeky/error-object` into this package
- Refactored to use the standalone `ErrorObject` class as a dependency instead of bundling it
- Updated playground examples

## 1.1.6

Version bump to align with `@smbcheeky/error-object` 1.1.5 dependency.

## 1.1.5

Initial release — extracted from `@smbcheeky/error-object` as a standalone addon.
