import { functions } from './apiClient';

export const socialMediaConnect = functions.socialMediaConnect;
export const socialMediaPost     = functions.socialMediaPost;

// keep every other stub for now
export const cesdkCreateDesign = async () => ({ status: 'stub' });
export const cesdkRenderDesign = async () => ({ status: 'stub' });
export const cesdkAddTextBlock = async () => ({ status: 'stub' });
export const cesdkAddImageBlock = async () => ({ status: 'stub' });
export const cesdkAddShapeBlock = async () => ({ status: 'stub' });
export const cesdkChangeBackground = async () => ({ status: 'stub' });
export const cesdkDeleteBlock  = async () => ({ status: 'stub' });
export const cesdkMoveBlock    = async () => ({ status: 'stub' });
export const getCESDKKey       = async () => ({ status: 'stub' });
export const socialMediaCallback = async () => ({ status: 'stub' });
export const socialMediaRefreshToken = async () => ({ status: 'stub' });
export const testConnect       = async () => ({ status: 'stub' });
export const applyContentToTemplate = async () => ({ status: 'stub' });
export const cesdkExtractBlocks = async () => ({ status: 'stub' });
export const cesdkInspectScene = async () => ({ status: 'stub' });
export const tiktokVerification = async () => ({ status: 'stub' });
export const testTikTokConfig  = async () => ({ status: 'stub' });
export const testOAuthCallback = async () => ({ status: 'stub' });

