import { useState } from "react";

const SAMPLE_IMAGING = `EXAMINATION: CT Chest with contrast
FINDINGS:
Lungs: 6mm pulmonary nodule in the right lower lobe. Mild bibasilar atelectasis.
Mediastinum: Heart normal in size.
IMPRESSION:
1. No pulmonary embolism.
2. 6mm right lower lobe pulmonary nodule. Recommend follow-up CT in 6-12 months.
3. Mild bibasilar atelectasis, likely positional.`;

const SAMPLE_BLOODWORK = `CBC WITH DIFFERENTIAL
WBC: 11.8 K/uL (ref: 4.5-11.0) HIGH
RBC: 3.6 M/uL (ref: 4.2-5.4) LOW
Hemoglobin: 9.8 g/dL (ref: 13.5-17.5) LOW
Platelets: 420 K/uL (ref: 150-400) HIGH
METABOLIC PANEL
Glucose: 126 mg/dL (ref: 70-99) HIGH
Creatinine: 1.1 mg/dL (ref: 0.6-1.2) NORMAL`;

const iFlag = {
  normal:    { bg:"#e8f5e9", text:"#2e7d32", border:"#a5d6a7", icon:"✓", label:"Normal" },
  monitor:   { bg:"#fff8e1", text:"#f57f17", border:"#ffe082", icon:"◎", label:"Monitor" },
  attention: { bg:"#fce4ec", text:"#b71c1c", border:"#f48fb1", icon:"!", label:"Follow Up" },
};
const lFlag = {
  NORMAL: { bg:"#e8f5e9", text:"#2e7d32", border:"#a5d6a7", icon:"✓", label:"Normal" },
  HIGH:   { bg:"#fff3e0", text:"#e65100", border:"#ffcc80", icon:"↑", label:"High" },
  LOW:    { bg:"#e3f2fd", text:"#1565c0", border:"#90caf9", icon:"↓", label:"Low" },
};

function srcColor(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("mayo"))     return { bg:"#e3f0fb", text:"#1565c0", dot:"#1976d2" };
  if (n.includes("medline") || n.includes("nih")) return { bg:"#e8f5e9", text:"#2e7d32", dot:"#388e3c" };
  if (n.includes("cleveland")) return { bg:"#fff3e0", text:"#e65100", dot:"#f57c00" };
  return { bg:"#f5f5f5", text:"#424242", dot:"#757575" };
}

function scanIcon(t) {
  const s = (t || "").toLowerCase();
  if (s.includes("ct") || s.includes("computed")) return "🫁";
  if (s.includes("mri")) return "🧠";
  if (s.includes("x-ray") || s.includes("xray")) return "🦴";
  if (s.includes("pet")) return "☢️";
  if (s.includes("ultrasound")) return "〰️";
  return "🔬";
}

function ResourceLink({ r }) {
  const c = srcColor(r.name);
  return (
    <a href={r.url} target="_blank" rel="noopener noreferrer"
      style={{ display:"flex", alignItems:"flex-start", gap:8, background:c.bg, border:"1px solid "+c.dot+"44", borderRadius:8, padding:"8px 10px", textDecoration:"none" }}>
      <span style={{ width:8, height:8, borderRadius:"50%", background:c.dot, flexShrink:0, marginTop:4 }}/>
      <div style={{ flex:1 }}>
        <span style={{ display:"block", color:c.text, fontSize:12, fontWeight:"bold" }}>{r.name}</span>
        {r.description && <span style={{ display:"block", color:c.text+"bb", fontSize:11, lineHeight:1.4 }}>{r.description}</span>}
      </div>
      <span style={{ color:c.dot, fontSize:12 }}>↗</span>
    </a>
  );
}

function Card({ f, bw, open, toggle }) {
  const cfg = bw ? (lFlag[f.flag] || lFlag.NORMAL) : (iFlag[f.flag] || iFlag.normal);
  const abn = bw && (f.flag === "HIGH" || f.flag === "LOW");
  return (
    <div style={{ border:"1.5px solid "+(open ? cfg.border : "#e0e8f0"), borderRadius:10, overflow:"hidden", background:open ? cfg.bg : "#fafcff", transition:"all 0.2s" }}>
      <div onClick={toggle} style={{ padding:"12px 14px", cursor:"pointer" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1 }}>
            <span style={{ fontWeight:"bold", color:"#0d2137", fontSize:14 }}>{bw ? f.test : f.term}</span>
            {bw && (
              <div style={{ display:"flex", gap:8, marginTop:2 }}>
                <span style={{ fontFamily:"monospace", fontSize:13, color:cfg.text, fontWeight:"bold" }}>{f.value}</span>
                {f.referenceRange && <span style={{ fontSize:12, color:"#889" }}>ref: {f.referenceRange}</span>}
              </div>
            )}
            {!open && <p style={{ margin:"4px 0 0", color:"#556", fontSize:13, lineHeight:1.4 }}>{f.plain}</p>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <span style={{ background:cfg.bg, color:cfg.text, border:"1px solid "+cfg.border, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:"bold" }}>{cfg.icon} {cfg.label}</span>
            <span style={{ color:"#aab", fontSize:14 }}>{open ? "▲" : "▼"}</span>
          </div>
        </div>
      </div>
      {open && (
        <div style={{ padding:"0 14px 14px", borderTop:"1px solid "+cfg.border+"66" }}>
          <p style={{ margin:"10px 0 6px", color:"#2c3e50", fontSize:14, lineHeight:1.65 }}>
            <strong>{bw ? "What this measures:" : "In plain English:"}</strong> {f.plain}
          </p>
          {abn && f.meaning && <p style={{ margin:"0 0 10px", color:"#34495e", fontSize:14, lineHeight:1.65 }}><strong>What this means:</strong> {f.meaning}</p>}
          {!bw && f.context && <p style={{ margin:"0 0 12px", color:"#556", fontSize:13, fontStyle:"italic", lineHeight:1.6 }}>{f.context}</p>}
          {abn && f.possibleCauses && f.possibleCauses.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:"bold", color:"#0d2137", textTransform:"uppercase", letterSpacing:"0.5px" }}>🔍 Possible Causes</p>
              {f.possibleCauses.map((c, i) => (
                <div key={i} style={{ background:"rgba(255,255,255,0.7)", borderRadius:8, padding:"8px 12px", marginBottom:6, border:"1px solid "+cfg.border+"55" }}>
                  <span style={{ display:"block", fontWeight:"bold", color:cfg.text, fontSize:13 }}>{c.cause}</span>
                  <span style={{ display:"block", color:"#556", fontSize:12, lineHeight:1.5, marginTop:2 }}>{c.explanation}</span>
                </div>
              ))}
              <p style={{ margin:"6px 0 0", fontSize:11, color:"#99a", fontStyle:"italic" }}>Only your doctor can determine the actual cause.</p>
            </div>
          )}
          {f.resources && f.resources.length > 0 && (
            <div>
              <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:"bold", color:"#0d2137", textTransform:"uppercase", letterSpacing:"0.5px" }}>📚 Learn More</p>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {f.resources.map((r, i) => <ResourceLink key={i} r={r} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [input, setInput]   = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy]     = useState(false);
  const [step, setStep]     = useState("");
  const [err, setErr]       = useState(null);
  const [exp, setExp]       = useState({});

  const run = async () => {
    if (!input.trim()) return;
    setBusy(true); setErr(null); setResult(null); setExp({});
    try {
      setStep("Analyzing your report...");
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportText: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");
      setResult(data);
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false); setStep("");
    }
  };

  const reset = () => { setResult(null); setInput(""); setExp({}); setErr(null); };
  const bw  = result && result.reportType === "bloodwork";
  const abn = bw ? result.findings.filter(f => f.flag !== "NORMAL").length : 0;

  return (
    <div style={{ minHeight:"100vh", background:"#f7f9fc", fontFamily:"'Palatino Linotype',Palatino,serif" }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(160deg,#0d2137 0%,#1b4f72 60%,#1a6b8a 100%)", padding:"36px 20px 32px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 70% 30%,rgba(100,200,255,0.08) 0%,transparent 60%)" }}/>
        <div style={{ position:"relative" }}>
          <div style={{ fontSize:42, marginBottom:10 }}>🏥</div>
          <h1 style={{ color:"#fff", fontSize:24, fontWeight:"normal", margin:"0 0 6px" }}>Medical Report Translator</h1>
          <p style={{ color:"rgba(255,255,255,0.65)", fontSize:14, margin:0, fontStyle:"italic" }}>Scans · Blood Work · Lab Results — explained in plain English</p>
        </div>
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"24px 16px 40px" }}>

        {/* Disclaimer — always visible */}
        <div style={{ background:"#fff8e1", border:"1px solid #ffe082", borderRadius:10, padding:"14px 16px", marginBottom:20, display:"flex", gap:10, alignItems:"flex-start" }}>
          <span style={{ fontSize:20, flexShrink:0 }}>⚕️</span>
          <p style={{ margin:0, fontSize:13, color:"#5d4037", lineHeight:1.6 }}>
            <strong>This tool is not a doctor.</strong> It explains medical language in plain English but cannot diagnose, treat, or replace professional medical advice. Always discuss your results with your healthcare provider.
          </p>
        </div>

        {/* Input */}
        {!result && (
          <div style={{ background:"#fff", borderRadius:14, padding:22, boxShadow:"0 2px 16px rgba(0,0,0,0.07)" }}>
            <label style={{ display:"block", color:"#0d2137", fontSize:14, fontWeight:"bold", marginBottom:6 }}>Paste your report below</label>
            <p style={{ margin:"0 0 10px", fontSize:13, color:"#778", fontStyle:"italic" }}>Works with CT, MRI, X-ray, PET scans and blood work / lab results</p>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              placeholder={"Paste your report text here...\n\nExamples:\n• FINDINGS: 6mm pulmonary nodule...\n• WBC: 11.8 K/uL (ref: 4.5-11.0) HIGH"}
              rows={10} style={{ width:"100%", border:"1.5px solid #cde", borderRadius:8, padding:"12px", fontSize:13, fontFamily:"'Courier New',monospace", color:"#2c3e50", resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.65, background:"#fafcff" }}/>
            <div style={{ display:"flex", gap:8, marginTop:10, alignItems:"center" }}>
              <span style={{ fontSize:12, color:"#889" }}>Try an example:</span>
              <button onClick={() => { setInput(SAMPLE_IMAGING); setErr(null); }} style={{ background:"#eef4fa", color:"#1b4f72", border:"1px solid #bcd", borderRadius:7, padding:"5px 12px", fontSize:12, cursor:"pointer" }}>🩻 CT Scan</button>
              <button onClick={() => { setInput(SAMPLE_BLOODWORK); setErr(null); }} style={{ background:"#fce4ec", color:"#880e4f", border:"1px solid #f48fb1", borderRadius:7, padding:"5px 12px", fontSize:12, cursor:"pointer" }}>🩸 Blood Work</button>
            </div>
            {err && (
              <div style={{ background:"#ffebee", border:"1px solid #ef9a9a", borderRadius:10, padding:14, marginTop:14 }}>
                <p style={{ margin:"0 0 4px", color:"#c62828", fontWeight:"bold", fontSize:14 }}>❌ Error</p>
                <p style={{ margin:0, color:"#c62828", fontSize:13, lineHeight:1.5 }}>{err}</p>
              </div>
            )}
            <button onClick={run} disabled={busy || !input.trim()} style={{ width:"100%", marginTop:16, background:busy || !input.trim() ? "#b0c4d8" : "linear-gradient(135deg,#0d2137,#1b4f72)", color:"#fff", border:"none", borderRadius:9, padding:"13px", fontSize:15, cursor:busy || !input.trim() ? "not-allowed" : "pointer", fontWeight:"bold" }}>
              {busy ? (step || "Analyzing...") : "🔍 Explain This Report"}
            </button>
          </div>
        )}

        {/* Loading */}
        {busy && (
          <div style={{ textAlign:"center", padding:"40px 20px" }}>
            <div style={{ fontSize:40, animation:"pulse 1.5s ease-in-out infinite", display:"inline-block" }}>🔬</div>
            <p style={{ marginTop:16, color:"#1b4f72", fontSize:15 }}>{step || "Analyzing..."}</p>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Disclaimer on results too */}
            <div style={{ background:"#fff8e1", border:"1px solid #ffe082", borderRadius:10, padding:"12px 16px", display:"flex", gap:10, alignItems:"flex-start" }}>
              <span style={{ fontSize:16, flexShrink:0 }}>⚕️</span>
              <p style={{ margin:0, fontSize:12, color:"#5d4037", lineHeight:1.5 }}>
                <strong>Not medical advice.</strong> This explanation is for health literacy only. Always discuss your results with your healthcare provider before making any decisions.
              </p>
            </div>

            {/* Summary */}
            <div style={{ background:"#fff", borderRadius:14, padding:22, boxShadow:"0 2px 16px rgba(0,0,0,0.07)", borderLeft:"5px solid #1b4f72" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <span style={{ fontSize:26 }}>{bw ? "🩸" : scanIcon(result.scanType)}</span>
                <span style={{ background:"#e8f0fe", color:"#1b4f72", padding:"4px 14px", borderRadius:20, fontSize:13, fontWeight:"bold" }}>
                  {bw ? result.panelName : result.scanType}
                </span>
              </div>
              {bw && (
                <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                  {[
                    { label:"Normal",   val:result.findings.length - abn, bg:"#e8f5e9", color:"#2e7d32" },
                    { label:"Abnormal", val:abn, bg:abn > 0 ? "#fff3e0" : "#f5f5f5", color:abn > 0 ? "#e65100" : "#999" },
                    { label:"Total",    val:result.findings.length, bg:"#f0f4f8", color:"#1b4f72" },
                  ].map(s => (
                    <div key={s.label} style={{ flex:1, background:s.bg, borderRadius:8, padding:10, textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:"bold", color:s.color }}>{s.val}</div>
                      <div style={{ fontSize:12, color:s.color }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <h2 style={{ color:"#0d2137", fontSize:16, margin:"0 0 8px", fontWeight:"bold" }}>📋 Overview</h2>
              <p style={{ margin:0, color:"#34495e", lineHeight:1.75, fontSize:15 }}>{result.summary}</p>
            </div>

            {/* Findings */}
            <div style={{ background:"#fff", borderRadius:14, padding:22, boxShadow:"0 2px 16px rgba(0,0,0,0.07)" }}>
              <h2 style={{ color:"#0d2137", fontSize:16, margin:"0 0 4px", fontWeight:"bold" }}>🔬 {bw ? "Your Results, Explained" : "Term-by-Term Breakdown"}</h2>
              <p style={{ color:"#889", fontSize:13, margin:"0 0 16px", fontStyle:"italic" }}>Tap any item to expand — includes possible causes and trusted resources</p>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {result.findings.map((f, i) => (
                  <Card key={i} f={f} bw={bw} open={!!exp[i]} toggle={() => setExp(p => ({ ...p, [i]: !p[i] }))} />
                ))}
              </div>
            </div>

            {/* Questions */}
            {result.questions && result.questions.length > 0 && (
              <div style={{ background:"#fff", borderRadius:14, padding:22, boxShadow:"0 2px 16px rgba(0,0,0,0.07)", borderLeft:"5px solid #2e7d32" }}>
                <h2 style={{ color:"#0d2137", fontSize:16, margin:"0 0 14px", fontWeight:"bold" }}>💬 Questions to Ask Your Doctor</h2>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {result.questions.map((q, i) => (
                    <div key={i} style={{ background:"#f1f8f2", borderRadius:8, padding:"11px 14px", display:"flex", gap:10 }}>
                      <span style={{ color:"#2e7d32", fontWeight:"bold", flexShrink:0 }}>{i + 1}.</span>
                      <span style={{ color:"#34495e", fontSize:14, lineHeight:1.55 }}>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ background:"#f0f4f8", borderRadius:10, padding:"12px 16px" }}>
              <p style={{ margin:0, fontSize:12, color:"#667", textAlign:"center" }}>
                🔗 Resources from Mayo Clinic, NIH MedlinePlus & Cleveland Clinic.<br/>
                This tool is not a doctor and does not provide medical advice.
              </p>
            </div>

            <button onClick={reset} style={{ background:"transparent", color:"#1b4f72", border:"1.5px solid #bcd", borderRadius:9, padding:"11px", fontSize:14, cursor:"pointer" }}>
              ↩ Analyze Another Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
