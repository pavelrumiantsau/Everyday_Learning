// Mini App features. To add one: create features/<Name>.tsx exporting a `MiniFeature`, then add it to the list.
// HomeEntry is shown on the home screen (return null to hide); Screen opens full-screen with Telegram's back button.
import type { FC } from "react";
import { inputFeature } from "./features/Input";
import { placementFeature } from "./features/Placement";
import { profileFeature } from "./features/Profile";

export interface MiniFeature {
  id: string;
  HomeEntry?: FC<{ open: () => void }>;
  Screen?: FC<{ close: () => void }>;
}

export const FEATURES: MiniFeature[] = [profileFeature, placementFeature, inputFeature];
