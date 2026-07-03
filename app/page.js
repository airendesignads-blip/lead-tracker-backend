"use client";
import { useEffect, useRef, useState } from "react";

const C = {
  bg:         "#0F172A",
  surface:    "#1E293B",
  text:       "#F1F5F9",
  muted:      "#64748B",
  pageBg:     "#F8FAFC",
  cardBg:     "#fff",
  accent:     "#6366F1",
  accentBg:   "#EEF2FF",
  accentText: "#4F46E5",
  green:      "#16A34A", greenBg: "#DCFCE7",
  red:        "#DC2626", redBg:   "#FEE2E2",
  amber:      "#D97706", amberBg: "#FEF3C7",
  blue:       "#2563EB", blueBg:  "#EFF6FF",
  pink:       "#EC4899", pinkDark:"#BE185D",
};

const pill = (bg, color, children) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:bg, color, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700 }}>{children}</span>
);
const dot = (color) => (
  <span style={{ width:6, height:6, borderRadius:"50%", background:color, display:"inline-block", flexShrink:0 }} />
);

// ── CONVERSATION PANEL — sa labas ng Dashboard para hindi mag-remount every render ──
function ConversationPanel({ selectedLead, replyText, setReplyText, sending, sendResult, sendReply, closePanel, chatEndRef, getReplyStatus, onAttachmentSent }) {
  // ── FILE / IMAGE / DOCX ATTACHMENT ─────────────────────────────────────
  const fileInputRef = useRef(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLead) return;

    setUploading(true);
    setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append("leadId", selectedLead.id);
      fd.append("file", file);

      const res  = await fetch("/api/messenger/send-attachment", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadResult({ ok: true, msg: `📎 Naipadala ang "${file.name}"!` });
      if (onAttachmentSent) await onAttachmentSent();
    } catch (err) {
      setUploadResult({ ok: false, msg: `❌ ${err.message}` });
    } finally {
      setUploading(false);
      e.target.value = "";
      setTimeout(() => setUploadResult(null), 3500);
    }
  };

  if (!selectedLead) return null;
  const acts   = selectedLead.activities || [];
  const status = getReplyStatus(selectedLead);
  return (
    <>
      <div onClick={closePanel} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:40 }} />
      <div style={{ position:"fixed", top:0, right:0, bottom:0, width:420, background:"#fff", zIndex:50, display:"flex", flexDirection:"column", boxShadow:"-4px 0 32px rgba(0,0,0,0.12)" }}>
        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #E2E8F0", display:"flex", alignItems:"center", gap:12, background:"#F8FAFC" }}>
          <div style={{ width:40, height:40, borderRadius:"50%", background:"#EEF2FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:C.accentText, flexShrink:0 }}>
            {(selectedLead.name||"?")[0].toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:15, color:"#0F172A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{selectedLead.name}</div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:status.bg, color:status.color, padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:700 }}>
                {dot(status.color)} {status.label}
              </span>
              <span style={{ fontSize:11, color:C.muted }}>· {selectedLead.source}</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <a href={`https://business.facebook.com/latest/inbox/direct/messenger/?asset_id=1678784839106037&threadID=${selectedLead.id}`} target="_blank" rel="noreferrer"
              style={{ padding:"6px 10px", borderRadius:7, border:"1.5px solid #E2E8F0", background:"#fff", color:C.blue, fontSize:11, fontWeight:700, textDecoration:"none", whiteSpace:"nowrap" }}>
              📘 Open
            </a>
            <button onClick={closePanel} style={{ padding:"6px 10px", borderRadius:7, border:"1.5px solid #E2E8F0", background:"#fff", color:C.muted, fontSize:13, cursor:"pointer", fontWeight:700 }}>✕</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12, background:"#F8FAFC" }}>
          {acts.length === 0 ? (
            <div style={{ textAlign:"center", color:C.muted, fontSize:13, marginTop:40 }}>Walang messages pa.</div>
          ) : acts.map((act, i) => {
            const isReply = !!act.aiReply;
            const msgText = isReply ? act.aiReply : (act.note || "—");
            const time    = act.createdAt ? new Date(act.createdAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "";
            return (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:isReply?"flex-end":"flex-start" }}>
                <div style={{ maxWidth:"80%", padding:"10px 14px", borderRadius:isReply?"16px 16px 4px 16px":"16px 16px 16px 4px", background:isReply?C.accent:"#fff", color:isReply?"#fff":"#1E293B", border:isReply?"none":"1px solid #E2E8F0", fontSize:13, lineHeight:1.5 }}>
                  {msgText}
                </div>
                <div style={{ fontSize:10, color:C.muted, marginTop:3, display:"flex", alignItems:"center", gap:4 }}>
                  {isReply
                    ? <><span style={{ color:C.green }}>✓ Sent</span> · {act.type==="manual_reply"?"Manual reply":"AI reply"} · {time}</>
                    : <>{selectedLead.name} · {time}</>}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Reply box */}
        <div style={{ padding:"14px 20px", borderTop:"1px solid #E2E8F0", background:"#fff" }}>
          {sendResult && (
            <div style={{ fontSize:12, color:sendResult.ok?C.green:C.red, marginBottom:8, fontWeight:600 }}>{sendResult.msg}</div>
          )}
          {uploadResult && (
            <div style={{ fontSize:12, color:uploadResult.ok?C.green:C.red, marginBottom:8, fontWeight:600 }}>{uploadResult.msg}</div>
          )}
          <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
            {/* Hidden file input — tumatanggap ng images, docs, pdf, zip, video, audio */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
              style={{ display:"none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Mag-attach ng image, file, o docx"
              style={{ width:44, height:44, borderRadius:10, border:"1.5px solid #E2E8F0", background:uploading?"#F1F5F9":"#fff", color:uploading?C.muted:C.accent, fontSize:20, fontWeight:700, cursor:uploading?"not-allowed":"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}
            >
              {uploading ? "…" : "+"}
            </button>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
              placeholder="Mag-type ng reply… (Enter to send, Shift+Enter for new line)"
              rows={3}
              style={{ flex:1, padding:"10px 12px", borderRadius:10, border:"1.5px solid #E2E8F0", fontSize:13, fontFamily:"inherit", resize:"none", outline:"none", lineHeight:1.5, color:"#0F172A" }}
            />
            <button
              onClick={sendReply}
              disabled={sending || !replyText.trim()}
              style={{ padding:"10px 16px", borderRadius:10, border:"none", background:sending||!replyText.trim()?"#E2E8F0":C.accent, color:sending||!replyText.trim()?C.muted:"#fff", fontWeight:700, fontSize:13, cursor:sending||!replyText.trim()?"not-allowed":"pointer", whiteSpace:"nowrap", flexShrink:0, height:44 }}
            >
              {sending ? "Sending…" : "Send 📤"}
            </button>
          </div>
          <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>💡 Mato-track sa Messenger inbox mo bilang "replied"</div>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const [leads,          setLeads]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [lastUpdated,    setLastUpdated]    = useState(null);
  const [activeTab,      setActiveTab]      = useState("messenger");
  const [updatingId,     setUpdatingId]     = useState(null);
  const [importing,      setImporting]      = useState(false);
  const [importResult,   setImportResult]   = useState(null);
  const [search,         setSearch]         = useState("");
  // Conversation panel
  const [selectedLead,   setSelectedLead]   = useState(null);
  const [replyText,      setReplyText]       = useState("");
  const [sending,        setSending]         = useState(false);
  const [sendResult,     setSendResult]      = useState(null);
  const chatEndRef = useRef(null);

  const fetchLeads = () => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        setLeads(data);
        setLoading(false);
        setLastUpdated(new Date());
        // Refresh selected lead conversation
        if (selectedLead) {
          const updated = data.find((l) => l.id === selectedLead.id);
          if (updated) setSelectedLead(updated);
        }
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/auto-archive", { method: "POST" }).catch(console.error);
    fetchLeads();
    const iv = setInterval(fetchLeads, 5000);
    return () => clearInterval(iv);
  }, []);

  // Walang auto-scroll — manual lang ang user kung kailan mag-scroll

  const importComments = async () => {
    setImporting(true); setImportResult(null);
    try {
      const res  = await fetch("/api/import-comments", { method: "POST" });
      const data = await res.json();
      setImportResult(`✅ Imported ${data.imported} comments!`);
      await fetchLeads();
    } catch { setImportResult("❌ Error importing comments."); }
    finally   { setImporting(false); }
  };

  // Send reply from CRM directly to Messenger
  const sendReply = async () => {
    if (!replyText.trim() || !selectedLead) return;
    setSending(true); setSendResult(null);
    try {
      const res  = await fetch("/api/messenger/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLead.id, message: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setReplyText("");
      setSendResult({ ok: true, msg: "Naipadala na! 🎉" });
      await fetchLeads();
    } catch (err) {
      setSendResult({ ok: false, msg: `❌ ${err.message}` });
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 3000);
    }
  };

  const doneStages = ["Facebook Done", "Email Done", "Done"];

  const getReplyStatus = (lead) => {
    const acts = lead.activities || [];
    if (!acts.length) return { label: "No Message", color: C.muted, bg: "#F1F5F9" };
    const last = acts[acts.length - 1];
    if (!last.aiReply) return { label: "Pending Reply", color: C.red, bg: C.redBg };
    const hasNew = acts.some((a) => !a.aiReply && new Date(a.createdAt) > new Date(last.createdAt));
    if (hasNew) return { label: "New Message!", color: C.amber, bg: C.amberBg };
    return { label: "Replied", color: C.green, bg: C.greenBg };
  };

  const openPanel = (lead) => { setSelectedLead(lead); setReplyText(""); setSendResult(null); };
  const closePanel = () => { setSelectedLead(null); setReplyText(""); setSendResult(null); };

  const markAsDone = async (leadId, source) => {
    setUpdatingId(leadId);
    const stage = source === "facebook" ? "Facebook Done" : "Email Done";
    try {
      await fetch(`/api/leads/${leadId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ stage }) });
      await fetchLeads();
    } finally { setUpdatingId(null); }
  };

  const markAsActive = async (leadId) => {
    setUpdatingId(leadId);
    try {
      await fetch(`/api/leads/${leadId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ stage:"Bagong Lead" }) });
      await fetchLeads();
    } finally { setUpdatingId(null); }
  };

  const messengerLeads = leads.filter((l) => !l.postId && !doneStages.includes(l.stage));
  const commentLeads   = leads.filter((l) =>  l.postId && !doneStages.includes(l.stage));
  const fbDoneLeads    = leads.filter((l) => l.stage === "Facebook Done");
  const emailDoneLeads = leads.filter((l) => l.stage === "Email Done");
  const pendingCount   = leads.filter((l) => getReplyStatus(l).label === "Pending Reply").length;

  const filteredLeads = () => {
    const base =
      activeTab === "messenger"     ? messengerLeads :
      activeTab === "comments"      ? commentLeads   :
      activeTab === "facebook-done" ? fbDoneLeads    :
      emailDoneLeads;
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((l) => (l.name||"").toLowerCase().includes(q) || (l.email||"").toLowerCase().includes(q));
  };

  const showCommentCols = activeTab === "comments";

  const NavItem = ({ icon, label, count, tab }) => {
    const active = activeTab === tab;
    return (
      <button onClick={() => setActiveTab(tab)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px", borderRadius:8, border:"none", cursor:"pointer", textAlign:"left", background:active ? C.surface : "transparent", color:active ? C.text : C.muted, fontSize:13, fontWeight:500, transition:"all .15s" }}>
        <span style={{ fontSize:15, width:18, textAlign:"center" }}>{icon}</span>
        {label}
        {count !== undefined && (
          <span style={{ marginLeft:"auto", background:active?"#312E81":C.surface, color:active?"#818CF8":C.muted, fontSize:11, fontWeight:700, padding:"1px 7px", borderRadius:20 }}>{count}</span>
        )}
      </button>
    );
  };

  const StatCard = ({ label, value, sub, subColor }) => (
    <div style={{ background:C.cardBg, borderRadius:12, padding:"16px 20px", border:"1px solid #E2E8F0", display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.5 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color:"#0F172A", letterSpacing:-1 }}>{value}</div>
      <div style={{ fontSize:11, fontWeight:500, color:subColor||C.muted }}>{sub}</div>
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Inter','Segoe UI',sans-serif", background:C.bg }}>

      {/* SIDEBAR */}
      <aside style={{ width:200, background:C.bg, borderRight:`1px solid ${C.surface}`, padding:"20px 14px", display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
        <div style={{ padding:"0 4px 16px", borderBottom:`1px solid ${C.surface}`, marginBottom:8 }}>
          <img src="/logo.png" alt="Ai-Ren Design Ads" onError={(e) => { e.target.style.display="none"; document.getElementById("sb-logo-fb").style.display="block"; }} style={{ width:"100%", maxHeight:56, objectFit:"contain", objectPosition:"left" }} />
          <div id="sb-logo-fb" style={{ display:"none" }}>
            <div style={{ fontSize:20, fontWeight:900, fontStyle:"italic", background:`linear-gradient(135deg,${C.pink},${C.pinkDark})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Ai-Ren</div>
            <div style={{ fontSize:9, fontWeight:800, color:C.muted, letterSpacing:1.5, textTransform:"uppercase" }}>Design Ads</div>
          </div>
        </div>
        <NavItem icon="👥" label="All Leads"  count={leads.length}          tab="all"          />
        <NavItem icon="💬" label="Messenger"   count={messengerLeads.length} tab="messenger"    />
        <NavItem icon="🗨️"  label="Comments"   count={commentLeads.length}   tab="comments"     />
        <NavItem icon="✅" label="FB Done"     count={fbDoneLeads.length}    tab="facebook-done"/>
        <NavItem icon="📧" label="Email Done"  count={emailDoneLeads.length} tab="email-done"   />
        <div style={{ marginTop:"auto", paddingTop:16, borderTop:`1px solid ${C.surface}` }}>
          <a href="/import" style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:8, color:C.muted, fontSize:13, fontWeight:500, textDecoration:"none" }}>➕ Import Leads</a>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1, background:C.pageBg, overflowX:"auto" }}>

        {/* TOP BAR */}
        <div style={{ background:"#fff", borderBottom:"1px solid #E2E8F0", padding:"14px 28px", display:"flex", alignItems:"center", gap:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
            <img src="/logo.png" alt="Ai-Ren Design Ads" onError={(e) => { e.target.style.display="none"; document.getElementById("tb-logo-fb").style.display="flex"; }} style={{ height:60, width:"auto", objectFit:"contain" }} />
            <div id="tb-logo-fb" style={{ display:"none", flexDirection:"column", lineHeight:1.1 }}>
              <span style={{ fontSize:30, fontWeight:900, fontStyle:"italic", letterSpacing:-1, background:`linear-gradient(135deg,${C.pink},${C.pinkDark})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Ai-Ren</span>
              <span style={{ fontSize:11, fontWeight:800, color:"#1E293B", letterSpacing:2, textTransform:"uppercase" }}>Design Ads</span>
            </div>
            <div style={{ width:1, height:52, background:"#E2E8F0" }} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <div style={{ fontSize:28, fontWeight:800, color:"#0F172A", letterSpacing:-1, lineHeight:1 }}>Lead Tracker</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:"#10B981", display:"inline-block", animation:"livePulse 1.5s infinite", flexShrink:0 }} />
              <span style={{ fontSize:13, color:"#10B981", fontWeight:700 }}>Live</span>
              {lastUpdated && <span style={{ fontSize:12, color:C.muted }}>· Updated {lastUpdated.toLocaleTimeString()}</span>}
            </div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:20 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
              <div style={{ fontSize:24, fontWeight:900, fontStyle:"italic", color:"#0F172A", letterSpacing:-0.5, lineHeight:1 }}>
                Analytics <span style={{ background:`linear-gradient(135deg,${C.pink} 0%,#8B5CF6 100%)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Real Time</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.muted }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:C.pink, display:"inline-block", animation:"livePulse 1.5s infinite" }} />
                Auto-refreshes every 5 seconds
              </div>
            </div>
            <button onClick={importComments} disabled={importing} style={{ padding:"9px 16px", borderRadius:8, fontSize:12, fontWeight:700, border:"none", cursor:importing?"not-allowed":"pointer", background:importing?"#9CA3AF":C.accent, color:"#fff", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", flexShrink:0 }}>
              📘 {importing ? "Importing…" : "Import FB Comments"}
            </button>
          </div>
        </div>

        {importResult && (
          <div style={{ padding:"10px 28px", fontSize:13, borderBottom:"1px solid #E2E8F0", background:importResult.startsWith("✅")?"#F0FDF4":"#FEF2F2", color:importResult.startsWith("✅")?C.green:C.red }}>{importResult}</div>
        )}

        {/* STATS */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, padding:"20px 28px" }}>
          <StatCard label="Total Leads"   value={leads.length}          sub="↑ All time"      subColor="#10B981" />
          <StatCard label="Messenger"     value={messengerLeads.length} sub="⏳ Active"        subColor={C.amber} />
          <StatCard label="Replied"       value={fbDoneLeads.length+emailDoneLeads.length} sub="✓ Done" subColor="#10B981" />
          <StatCard label="Pending Reply" value={pendingCount}           sub="🔥 Needs action" subColor={C.red}   />
        </div>

        {/* TABLE */}
        <div style={{ padding:"0 28px 28px" }}>
          <div style={{ background:"#fff", borderRadius:"12px 12px 0 0", border:"1px solid #E2E8F0", borderBottom:"none", padding:"12px 20px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <div style={{ position:"relative", flex:1, maxWidth:280 }}>
              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:12 }}>🔍</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads…" style={{ width:"100%", padding:"8px 12px 8px 30px", borderRadius:8, border:"1.5px solid #E2E8F0", fontSize:13, fontFamily:"inherit", outline:"none", color:"#0F172A" }} />
            </div>

            {/* Tip banner */}
            <div style={{ fontSize:11, color:C.accentText, background:C.accentBg, padding:"5px 10px", borderRadius:7, fontWeight:600 }}>
              💬 I-click ang name ng lead para mag-reply dito sa CRM
            </div>

            <div style={{ display:"flex", gap:4, marginLeft:"auto", flexWrap:"wrap" }}>
              {[
                { id:"messenger",     label:"💬 Messenger",  count:messengerLeads.length  },
                { id:"comments",      label:"🗨️ Comments",   count:commentLeads.length    },
                { id:"facebook-done", label:"✅ FB Done",    count:fbDoneLeads.length     },
                { id:"email-done",    label:"📧 Email Done", count:emailDoneLeads.length  },
              ].map(({ id, label, count }) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{ padding:"7px 12px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, background:activeTab===id?C.accentBg:"transparent", color:activeTab===id?C.accentText:C.muted, display:"flex", alignItems:"center", gap:5 }}>
                  {label}
                  <span style={{ background:activeTab===id?C.accentText:"#CBD5E1", color:"#fff", fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:20 }}>{count}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:"0 0 12px 12px", padding:40, textAlign:"center", color:C.muted }}>Loading…</div>
          ) : filteredLeads().length === 0 ? (
            <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:"0 0 12px 12px", padding:48, textAlign:"center", color:C.muted, fontSize:14 }}>Walang leads dito.</div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", background:"#fff", border:"1px solid #E2E8F0", borderRadius:"0 0 12px 12px", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#F8FAFC" }}>
                    {["Name","Email","Source",...(showCommentCols?["Post","Comment"]:[]),"Stage","Heat","Reply Status","Created","Action"].map((h) => (
                      <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.5, borderBottom:"1px solid #E2E8F0", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads().map((lead) => {
                    const status     = getReplyStatus(lead);
                    const stage      = lead.stage === "Bagong Lead" ? "New Lead" : lead.stage;
                    const isUpdating = updatingId === lead.id;
                    const isDone     = doneStages.includes(lead.stage);
                    const heatCfg    = lead.heat==="hot" ? {bg:C.redBg,color:C.red,icon:"🔥"} : lead.heat==="cold" ? {bg:C.blueBg,color:C.blue,icon:"🧊"} : {bg:C.amberBg,color:C.amber,icon:"🔥"};
                    const isPending  = status.label === "Pending Reply" || status.label === "New Message!";
                    return (
                      <tr key={lead.id} style={{ borderBottom:"1px solid #F1F5F9", background:isPending?"#FFFBEB":"#fff", transition:"background .1s" }}>
                        <td style={{ padding:"12px 16px" }}>
                          <span
                            onClick={() => openPanel(lead)}
                            style={{ fontWeight:700, color:C.blue, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}
                            title="I-click para mag-reply"
                          >
                            {isPending && <span style={{ width:7, height:7, borderRadius:"50%", background:C.red, display:"inline-block", animation:"livePulse 1.5s infinite" }} />}
                            {lead.name}
                            <span style={{ fontSize:10, background:C.accentBg, color:C.accentText, padding:"1px 6px", borderRadius:4, fontWeight:600 }}>Reply</span>
                          </span>
                        </td>
                        <td style={{ padding:"12px 16px", color:C.muted, fontSize:13 }}>{lead.email||"—"}</td>
                        <td style={{ padding:"12px 16px" }}>{pill(C.blueBg, C.blue, <>📘 {lead.source}</>)}</td>
                        {showCommentCols && <td style={{ padding:"12px 16px", fontSize:12, color:"#555", maxWidth:160 }}>{lead.postTitle||"—"}</td>}
                        {showCommentCols && <td style={{ padding:"12px 16px", fontSize:12, color:"#333", maxWidth:180 }}>{lead.comment||"—"}</td>}
                        <td style={{ padding:"12px 16px", fontSize:12, color:"#475569" }}>{stage}</td>
                        <td style={{ padding:"12px 16px" }}>{pill(heatCfg.bg, heatCfg.color, <>{heatCfg.icon} {lead.heat}</>)}</td>
                        <td style={{ padding:"12px 16px" }}>
                          <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:status.bg, color:status.color, padding:"4px 10px", borderRadius:999, fontSize:11, fontWeight:700 }}>
                            {dot(status.color)} {status.label}
                          </span>
                        </td>
                        <td style={{ padding:"12px 16px", fontSize:12, color:C.muted, whiteSpace:"nowrap" }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding:"12px 16px" }}>
                          {!isDone ? (
                            <button onClick={() => markAsDone(lead.id, lead.source)} disabled={isUpdating} style={{ padding:"5px 12px", fontSize:11, fontWeight:700, borderRadius:7, border:"1.5px solid #BBF7D0", background:isUpdating?"#F1F5F9":"#F0FDF4", color:isUpdating?C.muted:C.green, cursor:isUpdating?"not-allowed":"pointer", minWidth:90 }}>
                              {isUpdating ? "Saving…" : "✓ Mark Done"}
                            </button>
                          ) : (
                            <button onClick={() => markAsActive(lead.id)} disabled={isUpdating} style={{ padding:"5px 12px", fontSize:11, fontWeight:700, borderRadius:7, border:"1.5px solid #E2E8F0", background:"#F1F5F9", color:C.muted, cursor:isUpdating?"not-allowed":"pointer", minWidth:90 }}>
                              {isUpdating ? "Saving…" : "↩ Reopen"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* CONVERSATION PANEL */}
      <ConversationPanel
        selectedLead={selectedLead}
        replyText={replyText}
        setReplyText={setReplyText}
        sending={sending}
        sendResult={sendResult}
        sendReply={sendReply}
        closePanel={closePanel}
        chatEndRef={chatEndRef}
        getReplyStatus={getReplyStatus}
        onAttachmentSent={fetchLeads}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .45; transform: scale(.8); }
        }
        textarea:focus { border-color: #6366F1 !important; }
      `}</style>
    </div>
  );
}
