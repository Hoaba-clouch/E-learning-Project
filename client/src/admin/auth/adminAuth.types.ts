export type AdminLoginFormValues = {
  account: string;
  password: string;
  remember: boolean;
};

export type AdminLoginFormErrors = Partial<
  Record<keyof AdminLoginFormValues, string>
>;
