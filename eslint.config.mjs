import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Varios componentes hacen fetch de datos dentro de useEffect (cargar slots,
      // citas, notificaciones) y marcan un flag de carga al inicio — patrón válido.
      // La regla nueva de React 19 lo marca como error; la dejamos como aviso.
      // Migración correcta a futuro: mover estas cargas a React Query (ya instalado).
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
