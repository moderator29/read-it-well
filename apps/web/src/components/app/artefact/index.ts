/**
 * The artefact cards (north star 14.4, D14), for every surface that has a
 * tier: the Space Passport's tier (W6), trust tiers, Pro plans, promotion
 * tiers. One definition each; import from here rather than forking a card.
 *
 *   Credential       one matte credential, server-safe
 *   CredentialFan    the fanned stack that is its own selector (client)
 *   TrustTierFan     the verification ladder's tiers as credentials (client)
 *   fanPose, materialForStep   the fan's geometry and a ladder's materials
 */
export { Credential, type CredentialFace, type CredentialMaterial } from "./Credential";
export { CredentialFan, type FanItem } from "./CredentialFan";
export { TrustTierFan, type TrustTierItem } from "./TrustTierFan";
export { fanPose, materialForStep, type FanPose } from "./fan-pose";
