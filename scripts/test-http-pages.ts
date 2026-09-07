import { encode } from "next-auth/jwt";

async function testPages() {
  const secret = process.env.NEXTAUTH_SECRET || "haloui-local-secret";

  const token = await encode({
    token: {
      sub: "1",
      name: "Super Administrateur",
      email: "admin@erp.ma",
      role: "admin",
      isSuperadmin: true,
      companyId: 1,
    },
    secret,
  });

  const cookie = `next-auth.session-token=${token}`;
  const pages = [
    "/opportunites",
    "/grilles-tarifaires",
    "/commissions",
    "/pos",
  ];

  console.log("=== VÉRIFICATION DU RENDU DES PAGES EN LIGNE (HTTP) ===");

  for (const p of pages) {
    try {
      const res = await fetch(`http://localhost:3001${p}`, {
        headers: { Cookie: cookie },
      });
      const text = await res.text();
      console.log(`Route ${p} -> HTTP ${res.status} (Longueur HTML: ${text.length} octets)`);
      if (res.status !== 200) {
        console.error(`❌ Échec route ${p} : statut ${res.status}`);
      } else {
        console.log(`✓ Route ${p} s'affiche parfaitement !`);
      }
    } catch (err: any) {
      console.error(`❌ Erreur connexion route ${p}:`, err.message);
    }
  }
}

testPages();
