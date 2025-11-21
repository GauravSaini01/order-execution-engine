import { v4 as uuidv4 } from "uuid";
export const genMockTxHash = () => "mocktx_" + uuidv4().replace(/-/g, "").slice(0, 20);
