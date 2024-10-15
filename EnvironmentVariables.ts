export default class EnvironmentVariables<T extends string> {
  private _keys: T[];

  public constructor(keys: T[]) {
    this._keys = keys;
  }

  public get(key: T): string {
    if (!process.env) {
      throw new Error("Environment variables not found");
    }

    const value = process.env[key];
    if (!value) {
      throw new Error(`Environment variable not found for key: ${key}`);
    }

    return value;
  }
}
