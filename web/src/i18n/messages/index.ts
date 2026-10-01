import common from "./common";
import auth from "./auth";
import accountant from "./accountant";
import owner from "./owner";
import reports from "./reports";
import controller from "./controller";
import receipt from "./receipt";
import type { Locale } from "../config";

const build = (l: Locale) => ({
  common: common[l],
  auth: auth[l],
  accountant: accountant[l],
  owner: owner[l],
  reports: reports[l],
  controller: controller[l],
  receipt: receipt[l],
});

export type Messages = ReturnType<typeof build>;

export const messages: Record<Locale, Messages> = { fr: build("fr"), en: build("en") };
