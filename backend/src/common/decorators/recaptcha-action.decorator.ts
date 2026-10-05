import { SetMetadata } from '@nestjs/common';

export const RECAPTCHA_ACTION_KEY = 'recaptchaAction';

/**
 * Specifies the expected reCAPTCHA action for a route.
 * Used by RecaptchaGuard to validate the `action` field in the reCAPTCHA response.
 *
 * Example:
 *   @RecaptchaAction('login')
 *   @UseGuards(RecaptchaGuard)
 *   async login(...) {}
 */
export const RecaptchaAction = (action: string) =>
  SetMetadata(RECAPTCHA_ACTION_KEY, action);
