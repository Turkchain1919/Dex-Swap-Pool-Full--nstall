export enum TokenProtectionWarning {
  // THESE NUMERIC VALUES MATTER -- they are used for severity comparison
  Blocked = 10,
  MaliciousHoneypot = 9, // 100% fot
  FotVeryHigh = 8, // [80, 100)% fot
  MaliciousImpersonator = 7,
  FotHigh = 6, // [5, 80)% fot
  MaliciousGeneral = 5,
  PotentialHoneypot = 4.5, // Between SpamAirdrop (4) and MaliciousGeneral (5)
  ExitScamRisk = 4.25, // Blockaid's lower-confidence honeypot-adjacent bucket; below PotentialHoneypot
  SpamAirdrop = 4,
  FotLow = 3, // (0, 5)% fot
  NonDefault = 2,
  None = 1,
}
