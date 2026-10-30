# HyperFrames — Átomo 3D
Estudo cinematográfico original de um modelo estilizado de átomo, inteiramente geométrico via Three.js/WebGL.
Aspecto vertical 9:16, render base 1080 × 1920 a 30fps, 8 segundos; arquivo 4K 2160 × 3840 produzido por ampliação do render base, não por render 4K nativo.
## Identidade
Azul petróleo noturno #07121D; verde cyan #32E7CE; ouro champagne #E9B981; branco névoa #D0E6E6.
Tipografia editorial sans-serif de sistema, sem logos externos. Cena com geometria esférica metalizada, três órbitas inclinadas, elétrons e trilhas luminosas, câmera em perspectiva.
Movimento suave e determinístico, sem flashes/glitch. Nenhum dado real de física nuclear ou interface do cliente é inventado.
## Reuso
index.html é fonte de verdade. assets/three.min.js e assets/gsap.min.js são populados pelo CI no momento da renderização. Sem modelos binários; todos os objetos são gerados por código.