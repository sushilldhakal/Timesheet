import { readFile } from "node:fs/promises";
import path from "node:path";

export class OpenApiService {
  async readSpecFromPublic() {
    const filePath = path.join(process.cwd(), "public", "openapi.json");
    const file = await readFile(filePath, "utf8");
    return JSON.parse(file);
  }
}

export const openApiService = new OpenApiService();

