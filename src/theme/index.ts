import Moldura from "./Moldura";
import Home from "./Home";
import ComprarPreview from "./ComprarPreview";
import Vender from "./Vender";
import SobreNosPreview from "./SobreNosPreview";
import Veiculo from "./Veiculo";

// O preview do painel renderiza qualquer página no navegador, então pega todas daqui, nas
// versões sem nada de servidor. As rotas do site importam cada página direto (`Shell`, `Home`
// com `HomeStock`, `Comprar`, `Vender`, `SobreNos`, `Veiculo`): por este objeto, cada rota
// levaria também o código das outras (lição do Halo, 21/10/2026).
export const theme = { Shell: Moldura, Home, Comprar: ComprarPreview, Vender, SobreNos: SobreNosPreview, Veiculo };

// Identificador local; o cadastro deste tema no painel ainda depende da equipe.
export const THEME_ID = "delta" as const;
