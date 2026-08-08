import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import logoUrl from "@/assets/smartydiet-logo.png";

const PRIMARY = "#38b6ff";
const PRIMARY_DARK = "#0284c7";
const INK = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const BG_SOFT = "#f0f9ff";

function mealEmoji(name = "") {
  const n = name.toLowerCase();
  if (n.includes("break")) return "🍳";
  if (n.includes("lunch")) return "🥗";
  if (n.includes("dinner") || n.includes("supper")) return "🍽️";
  if (n.includes("snack")) return "🍎";
  if (n.includes("dessert")) return "🍓";
  return "🍴";
}

function categoryEmoji(cat = "") {
  const c = cat.toLowerCase();
  if (c.includes("produce") || c.includes("veg") || c.includes("fruit")) return "🥬";
  if (c.includes("meat") || c.includes("poultry")) return "🍗";
  if (c.includes("fish") || c.includes("seafood")) return "🐟";
  if (c.includes("dairy") || c.includes("egg")) return "🥛";
  if (c.includes("grain") || c.includes("bread") || c.includes("pasta")) return "🌾";
  if (c.includes("pantry") || c.includes("oil") || c.includes("spice")) return "🧂";
  if (c.includes("nut") || c.includes("seed")) return "🥜";
  if (c.includes("legume") || c.includes("bean")) return "🫘";
  return "🛒";
}

function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function shell(bodyHtml: string, title: string) {
  return `
  <div style="
    width:720px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Apple Color Emoji','Segoe UI Emoji',Roboto,Helvetica,Arial,sans-serif;
    color:${INK};background:#ffffff;padding:0;">
    <div style="background:linear-gradient(135deg,${PRIMARY} 0%,${PRIMARY_DARK} 100%);
      padding:24px 28px;display:flex;align-items:center;gap:14px;border-radius:0 0 20px 20px;">
      <img src="${logoUrl}" style="width:44px;height:44px;object-fit:contain;" crossorigin="anonymous"/>
      <div>
        <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.02em;">SmartyWorkout</div>
        <div style="color:rgba(255,255,255,0.9);font-size:13px;font-weight:500;">${esc(title)}</div>
      </div>
    </div>
    <div style="padding:24px 28px;">${bodyHtml}</div>
    <div style="padding:16px 28px;color:${MUTED};font-size:11px;text-align:center;border-top:1px solid ${BORDER};margin-top:8px;">
      Built by SmartyWorkout · smartyworkout.com
    </div>
  </div>`;
}

async function renderToPdf(html: string, filename: string) {
  const holder = document.createElement("div");
  holder.style.cssText =
    "position:fixed;left:-10000px;top:0;width:720px;background:#fff;z-index:-1;";
  holder.innerHTML = html;
  document.body.appendChild(holder);

  // wait for logo image
  const img = holder.querySelector("img");
  if (img && !(img as HTMLImageElement).complete) {
    await new Promise<void>((r) => {
      (img as HTMLImageElement).onload = () => r();
      (img as HTMLImageElement).onerror = () => r();
    });
  }
  await new Promise((r) => setTimeout(r, 50));

  try {
    const canvas = await html2canvas(holder, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH) {
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, imgW, imgH);
    } else {
      // slice into pages
      const pxPerPt = canvas.width / pageW;
      const pageHpx = pageH * pxPerPt;
      let offset = 0;
      let first = true;
      while (offset < canvas.height) {
        const sliceH = Math.min(pageHpx, canvas.height - offset);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sliceH;
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, offset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        if (!first) pdf.addPage();
        first = false;
        pdf.addImage(
          slice.toDataURL("image/jpeg", 0.92),
          "JPEG",
          0,
          0,
          pageW,
          (sliceH * pageW) / canvas.width,
        );
        offset += sliceH;
      }
    }
    pdf.save(filename);
  } finally {
    holder.remove();
  }
}

export async function exportPlanPdf(plan: any, durationWeeks: number) {
  const s = plan?.summary;
  const summary = s
    ? `
      <div style="background:${BG_SOFT};border:1px solid ${BORDER};border-radius:14px;padding:16px;margin-bottom:20px;">
        <div style="font-size:26px;font-weight:800;color:${PRIMARY_DARK};">${esc(s.calorieTarget)} kcal <span style="font-size:14px;color:${MUTED};font-weight:500;">/ day</span></div>
        <div style="margin-top:6px;font-size:13px;color:${INK};">
          <span style="display:inline-block;background:#fff;border:1px solid ${BORDER};border-radius:999px;padding:3px 10px;margin-right:6px;">💪 Protein ${esc(s.macros?.protein_g)}g</span>
          <span style="display:inline-block;background:#fff;border:1px solid ${BORDER};border-radius:999px;padding:3px 10px;margin-right:6px;">🌾 Carbs ${esc(s.macros?.carbs_g)}g</span>
          <span style="display:inline-block;background:#fff;border:1px solid ${BORDER};border-radius:999px;padding:3px 10px;">🥑 Fat ${esc(s.macros?.fat_g)}g</span>
        </div>
        <div style="margin-top:10px;font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:0.06em;">
          ${esc(s.dietStyle)} · ${esc(s.goal)}
        </div>
      </div>`
    : "";

  const weeksHtml = (plan?.weeks ?? [])
    .map(
      (w: any) => `
      <div style="margin-bottom:26px;">
        <h2 style="font-size:18px;font-weight:800;color:${PRIMARY_DARK};margin:0 0 12px;
          border-left:4px solid ${PRIMARY};padding-left:10px;">📅 Week ${esc(w.weekNumber)}</h2>
        ${(w.days ?? [])
          .map(
            (d: any) => `
          <div style="border:1px solid ${BORDER};border-radius:12px;padding:14px;margin-bottom:12px;background:#fff;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
              <div style="font-weight:700;font-size:15px;color:${INK};">Day ${esc(d.day)}</div>
              <div style="font-size:12px;color:${MUTED};font-weight:600;">🔥 ${esc(d.totals?.calories ?? "-")} kcal</div>
            </div>
            ${(d.meals ?? [])
              .map(
                (m: any) => `
              <div style="background:${BG_SOFT};border-radius:10px;padding:10px 12px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;gap:10px;">
                  <div style="font-weight:600;font-size:13px;color:${INK};">
                    ${mealEmoji(m.name)} <span style="color:${PRIMARY_DARK};">${esc(m.name)}:</span> ${esc(m.title)}
                  </div>
                  <div style="font-size:11px;color:${MUTED};white-space:nowrap;">
                    ${esc(m.calories)} kcal · P${esc(m.protein_g)} C${esc(m.carbs_g)} F${esc(m.fat_g)}
                  </div>
                </div>
                ${
                  m.ingredients?.length
                    ? `<div style="margin-top:6px;font-size:11px;color:${MUTED};">🧾 ${esc(
                        m.ingredients.map((i: any) => `${i.qty} ${i.item}`).join(", "),
                      )}</div>`
                    : ""
                }
                ${
                  m.instructions
                    ? `<div style="margin-top:4px;font-size:11px;color:${INK};">👨‍🍳 ${esc(m.instructions)}</div>`
                    : ""
                }
              </div>`,
              )
              .join("")}
          </div>`,
          )
          .join("")}
      </div>`,
    )
    .join("");

  const rationale = plan?.rationale
    ? `<div style="border:1px solid ${BORDER};border-radius:12px;padding:14px;margin-top:12px;background:#fff;">
        <div style="font-weight:700;color:${PRIMARY_DARK};margin-bottom:6px;">✨ Why this plan fits you</div>
        <div style="font-size:12px;color:${INK};line-height:1.6;">${esc(plan.rationale)}</div>
      </div>`
    : "";

  const disclaimer = plan?.disclaimer
    ? `<div style="margin-top:14px;font-size:10px;color:${MUTED};line-height:1.5;">${esc(plan.disclaimer)}</div>`
    : "";

  const body = summary + weeksHtml + rationale + disclaimer;
  await renderToPdf(shell(body, `Your ${durationWeeks}-week personalized plan`), "smartydiet-plan.pdf");
}

export async function exportGroceryPdf(plan: any) {
  const weeksHtml = (plan?.weeks ?? [])
    .map((w: any) => {
      const items = (w.groceryList ?? [])
        .map(
          (g: any) => `
          <li style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid ${BORDER};border-radius:8px;background:#fff;font-size:13px;">
            <span style="display:inline-block;width:14px;height:14px;border:2px solid ${PRIMARY};border-radius:4px;flex-shrink:0;"></span>
            <span style="font-size:14px;">${categoryEmoji(g.category)}</span>
            <span style="color:${INK};"><b>${esc(g.qty)}</b> ${esc(g.item)}</span>
            ${g.category ? `<span style="margin-left:auto;font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:0.05em;">${esc(g.category)}</span>` : ""}
          </li>`,
        )
        .join("");
      return `
        <div style="margin-bottom:22px;">
          <h2 style="font-size:18px;font-weight:800;color:${PRIMARY_DARK};margin:0 0 12px;
            border-left:4px solid ${PRIMARY};padding-left:10px;">🛒 Week ${esc(w.weekNumber)}</h2>
          <ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:8px;">${items}</ul>
        </div>`;
    })
    .join("");

  await renderToPdf(shell(weeksHtml, "Your printable grocery list"), "smartydiet-grocery.pdf");
}
