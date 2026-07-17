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

const PAYMENT_MODES = ["Cash", "GCash", "BDO", "PayPal", "PayMaya", "Bank Transfer"];

const GCASH_RECIPIENTS = [
  { name: "AIDLYN NGUJO",    number: "0917 620 6260" },
  { name: "SHIBA MAY NGUJO", number: "0917 580 8610" },
  { name: "ESMECA AN NGUJO", number: "0917 156 7536" },
];

const DEFAULT_REPLIES = [
  { id:"1", title:"Welcome",        text:"Salamat sa iyong message! Sandali lang ha. 😊" },
  { id:"2", title:"Pricing UV DTF", text:"Terms: ✓400 Pesos for 10 inches x 22 inches ✓For UV DTF, dapat ready to print na ang file bago e-send sa email address ng Ai-ren Design Ads. ✓No White Background sa mismong file.\n\nVISIT US: MC Briones St. Hiway Guizo 6014 Mandaue, Philippines (Beside Korean Surplus)\nContact us: (032) 318-3089 | 09175808616\nEmail: airendesignads@gmail.com\nFB PAGE: https://www.facebook.com/airengarments\n\n50% Downpayment Full Payment Upon Pick-Up or Before Delivery / Shipment\nNationwide Shipping Charge to Client" },
  { id:"3", title:"Payment GCash",  text:"Para sa gustong magbayad through Gcash:\n0917 620 6260 - AIDLYN NGUJO\nGCASH 0917 580 8610 - SHIBA MAY NGUJO\nGCASH 0917 156 7536 - ESMECA AN NGUJO" },
  { id:"4", title:"Address",        text:"Ai-ren Design Ads\nHiway Guizo, Mandaue City, (Beside Korean Surplus)\nBUSINESS HOURS: From Monday to Saturday 9:00am to 12:00nn / 1:00pm to 6:00pm" },
  { id:"5", title:"Pick Up",        text:"Pwede na ma pick up sir/maam! 😊" },
];

function ConversationPanel({ selectedLead, replyText, setReplyText, sending, sendResult, sendReply, closePanel, chatEndRef, getReplyStatus }) {
  const [showSavedReplies, setShowSavedReplies] = useState(false);
  const [savedReplies,     setSavedReplies]     = useState([]);
  const [showAddForm,      setShowAddForm]      = useState(false);
  const [newTitle,         setNewTitle]         = useState("");
  const [newText,          setNewText]          = useState("");
  const [editingId,        setEditingId]        = useState(null);
  const [searchReply,      setSearchReply]      = useState("");
  const [showAttachMenu,   setShowAttachMenu]   = useState(false);
  const [uploadStatus,     setUploadStatus]     = useState(null);
  const [uploading,        setUploading]        = useState(false);
  const fileInputRef = useRef(null);
  const attachAccept = useRef("*/*");

  const [fbMessages,    setFbMessages]    = useState([]);
  const [fbLoading,     setFbLoading]     = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("crm_saved_replies");
      setSavedReplies(stored ? JSON.parse(stored) : DEFAULT_REPLIES);
    } catch { setSavedReplies(DEFAULT_REPLIES); }
  }, []);

  useEffect(() => {
    if (!selectedLead) return;
    setFbMessages([]); setFbLoading(true);
    fetch(`/api/messenger/conversation/${selectedLead.id}`)
      .then(r => r.json())
      .then(data => { setFbMessages(data.messages || []); })
      .catch(() => {})
      .finally(() => setFbLoading(false));
  }, [selectedLead?.id]);

  const saveToStorage = (replies) => {
    setSavedReplies(replies);
    try { localStorage.setItem("crm_saved_replies", JSON.stringify(replies)); } catch {}
  };

  const addReply = () => {
    if (!newTitle.trim() || !newText.trim()) return;
    if (editingId) {
      saveToStorage(savedReplies.map(r => r.id === editingId ? { ...r, title: newTitle.trim(), text: newText.trim() } : r));
      setEditingId(null);
    } else {
      saveToStorage([...savedReplies, { id: Date.now().toString(), title: newTitle.trim(), text: newText.trim() }]);
    }
    setNewTitle(""); setNewText(""); setShowAddForm(false);
  };

  const deleteReply = (id) => saveToStorage(savedReplies.filter(r => r.id !== id));
  const startEdit = (r) => { setEditingId(r.id); setNewTitle(r.title); setNewText(r.text); setShowAddForm(true); };
  const useReply  = (text) => { setReplyText(text); setShowSavedReplies(false); };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLead) return;
    setUploading(true); setUploadStatus(null); setShowAttachMenu(false);
    try {
      const form = new FormData();
      form.append("leadId", selectedLead.id);
      form.append("file", file);
      const res  = await fetch("/api/messenger/send-attachment", { method:"POST", body:form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadStatus({ ok:true, msg:`✅ Naipadala na ang ${file.name}!` });
    } catch (err) {
      setUploadStatus({ ok:false, msg:`❌ ${err.message}` });
    } finally {
      setUploading(false);
      e.target.value = "";
      setTimeout(() => setUploadStatus(null), 4000);
    }
  };

  const openFilePicker = (accept) => {
    attachAccept.current = accept;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };

  const filtered = savedReplies.filter(r =>
    r.title.toLowerCase().includes(searchReply.toLowerCase()) ||
    r.text.toLowerCase().includes(searchReply.toLowerCase())
  );

  if (!selectedLead) return null;
  const acts   = selectedLead.activities || [];
  const status = getReplyStatus(selectedLead);

  return (
    <>
      <div onClick={() => { closePanel(); setShowSavedReplies(false); setShowAttachMenu(false); }}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:40 }} />
      <div style={{ position:"fixed", top:0, right:0, bottom:0, width:440, background:"#fff", zIndex:50, display:"flex", flexDirection:"column", boxShadow:"-4px 0 32px rgba(0,0,0,0.12)" }}>

        <div style={{ padding:"14px 18px", borderBottom:"1px solid #E2E8F0", display:"flex", alignItems:"center", gap:10, background:"#F8FAFC", flexShrink:0 }}>
          <div style={{ width:38, height:38, borderRadius:"50%", background:"#EEF2FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:C.accentText, flexShrink:0 }}>
            {(selectedLead.name||"?")[0].toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#0F172A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{selectedLead.name}</div>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:1 }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:status.bg, color:status.color, padding:"1px 7px", borderRadius:999, fontSize:10, fontWeight:700 }}>
                {dot(status.color)} {status.label}
              </span>
              <span style={{ fontSize:10, color:C.muted }}>· {selectedLead.source}</span>
            </div>
          </div>
          <a href={`https://business.facebook.com/latest/inbox/direct/messenger/?asset_id=1678784839106037&threadID=${selectedLead.id}`}
            target="_blank" rel="noreferrer"
            style={{ padding:"5px 9px", borderRadius:7, border:"1.5px solid #E2E8F0", background:"#fff", color:C.blue, fontSize:11, fontWeight:700, textDecoration:"none", whiteSpace:"nowrap" }}>
            📘 Open
          </a>
          <button onClick={closePanel}
            style={{ padding:"5px 9px", borderRadius:7, border:"1.5px solid #E2E8F0", background:"#fff", color:C.muted, fontSize:12, cursor:"pointer", fontWeight:700 }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"14px 18px", display:"flex", flexDirection:"column", gap:10, background:"#F8FAFC" }}>
          {fbLoading ? (
            <div style={{ textAlign:"center", color:C.muted, fontSize:13, marginTop:40 }}>
              <div style={{ fontSize:20, marginBottom:8 }}>💬</div>
              Loading messages from Messenger...
            </div>
          ) : fbMessages.length === 0 ? (
            <div style={{ textAlign:"center", color:C.muted, fontSize:13, marginTop:40 }}>Walang messages pa.</div>
          ) : fbMessages.map((msg, i) => {
            const isPage = msg.isPage;
            const time   = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "";
            const date   = msg.createdAt ? new Date(msg.createdAt).toLocaleDateString([], { month:"short", day:"numeric" }) : "";
            const prevDate = i > 0 && fbMessages[i-1].createdAt ? new Date(fbMessages[i-1].createdAt).toLocaleDateString() : null;
            const curDate  = msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : null;
            const showDate = i === 0 || prevDate !== curDate;
            return (
              <div key={msg.id || i}>
                {showDate && (
                  <div style={{ textAlign:"center", fontSize:10, color:C.muted, margin:"8px 0", display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ flex:1, height:1, background:"#E2E8F0" }} />
                    {date}
                    <div style={{ flex:1, height:1, background:"#E2E8F0" }} />
                  </div>
                )}
                <div style={{ display:"flex", flexDirection:"column", alignItems:isPage?"flex-end":"flex-start" }}>
                  {msg.attachments?.length > 0 && msg.attachments.map((att, ai) => (
                    <div key={ai} style={{ maxWidth:"82%", marginBottom:4, padding:"8px 10px", borderRadius:12, background:isPage?C.accent:"#fff", border:isPage?"none":"1px solid #E2E8F0", color:isPage?"#fff":C.muted, fontSize:12 }}>
                      📎 {att.name || att.type || "Attachment"}
                    </div>
                  ))}
                  {msg.text && (
                    <div style={{ maxWidth:"82%", padding:"9px 13px", borderRadius:isPage?"16px 16px 4px 16px":"16px 16px 16px 4px", background:isPage?C.accent:"#fff", color:isPage?"#fff":"#1E293B", border:isPage?"none":"1px solid #E2E8F0", fontSize:13, lineHeight:1.5, whiteSpace:"pre-wrap" }}>
                      {msg.text}
                    </div>
                  )}
                  <div style={{ fontSize:10, color:C.muted, marginTop:2, display:"flex", alignItems:"center", gap:3 }}>
                    {isPage ? <><span style={{ color:C.green }}>✓</span> {msg.from} · {time}</> : <>{msg.from} · {time}</>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {showSavedReplies && (
          <div style={{ borderTop:"1px solid #E2E8F0", background:"#fff", maxHeight:300, display:"flex", flexDirection:"column", flexShrink:0 }}>
            <div style={{ padding:"10px 16px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontWeight:700, fontSize:13, color:"#0F172A", flex:1 }}>💬 Saved Replies</span>
              <button onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); setNewTitle(""); setNewText(""); }}
                style={{ padding:"4px 10px", borderRadius:7, border:`1.5px solid ${C.accent}`, background:C.accentBg, color:C.accentText, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                {showAddForm && !editingId ? "✕ Cancel" : "+ Add New"}
              </button>
            </div>
            {showAddForm && (
              <div style={{ padding:"10px 16px", borderBottom:"1px solid #F1F5F9", background:"#FAFBFF", display:"flex", flexDirection:"column", gap:6 }}>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title (e.g. Welcome, Pricing...)"
                  style={{ padding:"7px 10px", borderRadius:7, border:"1.5px solid #E2E8F0", fontSize:12, fontFamily:"inherit", outline:"none", color:"#0F172A" }} />
                <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="I-type ang reply template dito..." rows={3}
                  style={{ padding:"7px 10px", borderRadius:7, border:"1.5px solid #E2E8F0", fontSize:12, fontFamily:"inherit", outline:"none", resize:"none", color:"#0F172A", lineHeight:1.5 }} />
                <button onClick={addReply} disabled={!newTitle.trim()||!newText.trim()}
                  style={{ padding:"7px 12px", borderRadius:7, border:"none", background:!newTitle.trim()||!newText.trim()?"#E2E8F0":C.accent, color:!newTitle.trim()||!newText.trim()?C.muted:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                  {editingId ? "💾 Save Changes" : "✓ Save Reply"}
                </button>
              </div>
            )}
            <div style={{ padding:"8px 16px", borderBottom:"1px solid #F1F5F9" }}>
              <input value={searchReply} onChange={e => setSearchReply(e.target.value)} placeholder="🔍 Hanapin ang reply..."
                style={{ width:"100%", padding:"6px 10px", borderRadius:7, border:"1.5px solid #E2E8F0", fontSize:12, fontFamily:"inherit", outline:"none", color:"#0F172A", boxSizing:"border-box" }} />
            </div>
            <div style={{ overflowY:"auto", flex:1 }}>
              {filtered.length === 0 ? (
                <div style={{ padding:16, textAlign:"center", color:C.muted, fontSize:12 }}>Walang nahanap.</div>
              ) : filtered.map(r => (
                <div key={r.id} style={{ padding:"9px 16px", borderBottom:"1px solid #F8FAFC", display:"flex", alignItems:"flex-start", gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#0F172A", marginBottom:2 }}>{r.title}</div>
                    <div style={{ fontSize:11, color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.text}</div>
                  </div>
                  <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                    <button onClick={() => useReply(r.text)} style={{ padding:"4px 10px", borderRadius:6, border:"none", background:C.accent, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Use</button>
                    <button onClick={() => startEdit(r)}     style={{ padding:"4px 8px", borderRadius:6, border:"1.5px solid #E2E8F0", background:"#fff", color:C.muted, fontSize:11, cursor:"pointer" }}>✏️</button>
                    <button onClick={() => deleteReply(r.id)} style={{ padding:"4px 8px", borderRadius:6, border:"1.5px solid #FEE2E2", background:"#FEF2F2", color:C.red, fontSize:11, cursor:"pointer" }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding:"12px 16px", borderTop:"1px solid #E2E8F0", background:"#fff", flexShrink:0 }}>
          {sendResult   && <div style={{ fontSize:12, color:sendResult.ok?C.green:C.red,    marginBottom:6, fontWeight:600 }}>{sendResult.msg}</div>}
          {uploadStatus && <div style={{ fontSize:12, color:uploadStatus.ok?C.green:C.red,  marginBottom:6, fontWeight:600 }}>{uploadStatus.msg}</div>}

          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
            <div style={{ position:"relative" }}>
              <button onClick={() => { setShowAttachMenu(!showAttachMenu); setShowSavedReplies(false); }} disabled={uploading}
                style={{ width:34, height:34, borderRadius:8, border:"1.5px solid #E2E8F0", background:showAttachMenu?"#F1F5F9":"#fff", color:uploading?C.muted:"#0F172A", fontSize:20, cursor:uploading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}
                title="Mag-attach ng file">
                {uploading ? "⏳" : "+"}
              </button>
              {showAttachMenu && (
                <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,0.12)", padding:6, display:"flex", flexDirection:"column", gap:2, minWidth:160, zIndex:10 }}>
                  {[
                    { icon:"🖼️", label:"Image",    accept:"image/*" },
                    { icon:"🎥", label:"Video",    accept:"video/*" },
                    { icon:"🎵", label:"Audio",    accept:"audio/*" },
                    { icon:"📄", label:"PDF",      accept:".pdf" },
                    { icon:"📝", label:"Word Doc", accept:".doc,.docx" },
                    { icon:"📊", label:"Excel",    accept:".xls,.xlsx" },
                    { icon:"📁", label:"Any File", accept:"*/*" },
                  ].map(({ icon, label, accept }) => (
                    <button key={label} onClick={() => openFilePicker(accept)}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:7, border:"none", background:"transparent", cursor:"pointer", fontSize:13, color:"#0F172A", textAlign:"left", width:"100%" }}
                      onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                      <span style={{ fontSize:16 }}>{icon}</span> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => { setShowSavedReplies(!showSavedReplies); setShowAttachMenu(false); setShowAddForm(false); }}
              style={{ padding:"6px 12px", borderRadius:7, border:`1.5px solid ${showSavedReplies?C.accent:"#E2E8F0"}`, background:showSavedReplies?C.accentBg:"#fff", color:showSavedReplies?C.accentText:C.muted, fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4, height:34 }}>
              💬 Saved Replies {showSavedReplies ? "▲" : "▼"}
            </button>
          </div>

          <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
              placeholder="Mag-type ng reply… (Enter to send, Shift+Enter for new line)" rows={3}
              style={{ flex:1, padding:"10px 12px", borderRadius:10, border:"1.5px solid #E2E8F0", fontSize:13, fontFamily:"inherit", resize:"none", outline:"none", lineHeight:1.5, color:"#0F172A" }} />
            <button onClick={sendReply} disabled={sending||!replyText.trim()}
              style={{ padding:"10px 14px", borderRadius:10, border:"none", background:sending||!replyText.trim()?"#E2E8F0":C.accent, color:sending||!replyText.trim()?C.muted:"#fff", fontWeight:700, fontSize:13, cursor:sending||!replyText.trim()?"not-allowed":"pointer", whiteSpace:"nowrap", flexShrink:0, height:44 }}>
              {sending ? "Sending…" : "Send 📤"}
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" style={{ display:"none" }} onChange={handleFileChange} />
      </div>
    </>
  );
}

function PaymentModal({ lead, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [mode,   setMode]   = useState(PAYMENT_MODES[0]);
  const [description, setDescription] = useState("");
  const [gcashRecipient, setGcashRecipient] = useState(GCASH_RECIPIENTS[0].name);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const save = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Ilagay ang tamang halaga."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          mode,
          leadName: lead.name,
          description: description.trim(),
          gcashRecipient: mode === "GCash" ? gcashRecipient : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:60 }} />
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"#fff", borderRadius:14, padding:24, width:340, zIndex:70, boxShadow:"0 16px 48px rgba(0,0,0,0.3)" }}>
        <div style={{ fontWeight:800, fontSize:16, color:"#0F172A", marginBottom:4 }}>💰 Add Payment</div>
        <div style={{ fontSize:12.5, color:C.muted, marginBottom:16 }}>{lead.name}</div>

        <label style={{ fontSize:11.5, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Amount</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
          style={{ width:"100%", boxSizing:"border-box", padding:"9px 11px", borderRadius:8, border:"1.5px solid #E2E8F0", fontSize:13.5, fontFamily:"inherit", marginBottom:12, color:"#0F172A" }} />

        <label style={{ fontSize:11.5, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Mode of Payment</label>
        <select value={mode} onChange={e => setMode(e.target.value)}
          style={{ width:"100%", boxSizing:"border-box", padding:"9px 11px", borderRadius:8, border:"1.5px solid #E2E8F0", fontSize:13.5, fontFamily:"inherit", marginBottom:12, color:"#0F172A", background:"#fff" }}>
          {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {mode === "GCash" && (
          <>
            <label style={{ fontSize:11.5, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Ipinadala kay</label>
            <select value={gcashRecipient} onChange={e => setGcashRecipient(e.target.value)}
              style={{ width:"100%", boxSizing:"border-box", padding:"9px 11px", borderRadius:8, border:"1.5px solid #E2E8F0", fontSize:13.5, fontFamily:"inherit", marginBottom:12, color:"#0F172A", background:"#fff" }}>
              {GCASH_RECIPIENTS.map(r => (
                <option key={r.name} value={r.name}>{r.name} — {r.number}</option>
              ))}
            </select>
          </>
        )}

        <label style={{ fontSize:11.5, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Description / Items (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="hal. 20pcs Customized Cap, Cuff & Collar..." rows={3}
          style={{ width:"100%", boxSizing:"border-box", padding:"9px 11px", borderRadius:8, border:"1.5px solid #E2E8F0", fontSize:13.5, fontFamily:"inherit", marginBottom:16, color:"#0F172A", resize:"vertical" }} />

        {error && <div style={{ fontSize:12, color:C.red, marginBottom:10, fontWeight:600 }}>{error}</div>}

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} disabled={saving}
            style={{ flex:1, padding:10, borderRadius:8, border:"1.5px solid #E2E8F0", background:"#F8FAFC", color:"#0F172A", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            style={{ flex:1, padding:10, borderRadius:8, border:"none", background:saving?"#9CA3AF":C.accent, color:"#fff", fontWeight:700, fontSize:13, cursor:saving?"not-allowed":"pointer" }}>
            {saving ? "Saving…" : "Save Payment"}
          </button>
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
  const [selectedLead,   setSelectedLead]   = useState(null);
  const [replyText,      setReplyText]       = useState("");
  const [sending,        setSending]         = useState(false);
  const [sendResult,     setSendResult]      = useState(null);
  const [paymentLead,    setPaymentLead]     = useState(null);
  const [paymentToast,   setPaymentToast]    = useState(null);
  // ── NEW: rename state ─────────────────────────────────────────────────
  const [renamingId,     setRenamingId]      = useState(null);
  const [renameValue,    setRenameValue]     = useState("");
  const chatEndRef = useRef(null);

  const fetchLeads = () => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        setLeads(data);
        setLoading(false);
        setLastUpdated(new Date());
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
      if (data.outsideWindow) {
        setSendResult({ ok: false, msg: "⏰ Luma na ang conversation. Binubuksan ang Messenger..." });
        setTimeout(() => {
          window.open(
            `https://business.facebook.com/latest/inbox/direct/messenger/?asset_id=1678784839106037&threadID=${selectedLead.id}`,
            "_blank"
          );
          setSendResult(null);
        }, 1200);
        return;
      }
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

  // ── RENAME FUNCTION ───────────────────────────────────────────────────
  const saveName = async (leadId) => {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingId(null); return; }
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      fetchLeads();
    } catch (err) {
      console.error("Rename error:", err);
    } finally {
      setRenamingId(null);
      setRenameValue("");
    }
  };

  const doneStages = ["Facebook Done", "Email Done", "Done"];

  const timeSince = (iso) => {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "ngayon lang";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  const getReplyStatus = (lead) => {
    const acts = lead.activities || [];
    if (!acts.length) return { label: "No Message Yet", color: C.muted, bg: "#F1F5F9" };

    const sorted = [...acts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Hanapin ang pinakahuli na CUSTOMER message at pinakahuli na REPLY NAMIN
    // base sa createdAt — kung sinong huli, yun ang nagde-determine ng status
    let lastCustomerTime = null;
    let lastOurReplyTime = null;
    let lastCustomerMsg  = null;
    let lastOurReply     = null;

    for (const a of sorted) {
      const t = new Date(a.createdAt);
      const isOurReply = a.type === "manual_reply" ||
                         (a.aiReply !== null && a.aiReply !== undefined && a.aiReply !== "");
      const isCustomer = !isOurReply && a.note && a.note.trim() !== "";

      if (isCustomer) {
        if (!lastCustomerTime || t > lastCustomerTime) {
          lastCustomerTime = t;
          lastCustomerMsg  = a;
        }
      }
      if (isOurReply) {
        if (!lastOurReplyTime || t > lastOurReplyTime) {
          lastOurReplyTime = t;
          lastOurReply     = a;
        }
      }
    }

    if (!lastCustomerMsg && !lastOurReply) {
      return { label: "No Message Yet", color: C.muted, bg: "#F1F5F9" };
    }

    // Kung ang pinakabago ay customer message — kailangan namin mag-reply
    if (lastCustomerMsg && (!lastOurReply || lastCustomerTime > lastOurReplyTime)) {
      return {
        label: "Needs Our Reply",
        color: C.red,
        bg: C.redBg,
        since: lastCustomerMsg.createdAt,
      };
    }

    // Kung ang pinakabago ay reply namin — waiting for customer
    return {
      label: "Waiting for Customer",
      color: C.blue,
      bg: C.blueBg,
      noReplyFrom: lastOurReply ? lastOurReply.createdAt : null,
    };
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

  const handlePaymentSaved = () => {
    setPaymentLead(null);
    setPaymentToast("✅ Payment saved — makikita na rin sa Job Order History/Sales Report.");
    fetchLeads();
    setTimeout(() => setPaymentToast(null), 4000);
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

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Inter','Segoe UI',sans-serif", background:C.bg }}>

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

      <main style={{ flex:1, background:C.pageBg, overflowX:"auto" }}>

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
            <a href="https://airendesignads.com/job-orders.html" style={{ padding:"9px 16px", borderRadius:8, fontSize:12, fontWeight:700, border:"1.5px solid #E2E8F0", background:"#fff", color:"#0F172A", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", flexShrink:0, textDecoration:"none" }}>
              ← Back to JO
            </a>
            <button onClick={importComments} disabled={importing} style={{ padding:"9px 16px", borderRadius:8, fontSize:12, fontWeight:700, border:"none", cursor:importing?"not-allowed":"pointer", background:importing?"#9CA3AF":C.accent, color:"#fff", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", flexShrink:0 }}>
              📘 {importing ? "Importing…" : "Import FB Comments"}
            </button>
          </div>
        </div>

        {importResult && (
          <div style={{ padding:"10px 28px", fontSize:13, borderBottom:"1px solid #E2E8F0", background:importResult.startsWith("✅")?"#F0FDF4":"#FEF2F2", color:importResult.startsWith("✅")?C.green:C.red }}>{importResult}</div>
        )}
        {paymentToast && (
          <div style={{ padding:"10px 28px", fontSize:13, borderBottom:"1px solid #E2E8F0", background:"#F0FDF4", color:C.green }}>{paymentToast}</div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, padding:"20px 28px" }}>
          <StatCard label="Total Leads"   value={leads.length}          sub="↑ All time"      subColor="#10B981" />
          <StatCard label="Messenger"     value={messengerLeads.length} sub="⏳ Active"        subColor={C.amber} />
          <StatCard label="Replied"       value={fbDoneLeads.length+emailDoneLeads.length} sub="✓ Done" subColor="#10B981" />
          <StatCard label="Pending Reply" value={pendingCount}           sub="🔥 Needs action" subColor={C.red}   />
        </div>

        <div style={{ padding:"0 28px 28px" }}>
          <div style={{ background:"#fff", borderRadius:"12px 12px 0 0", border:"1px solid #E2E8F0", borderBottom:"none", padding:"12px 20px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <div style={{ position:"relative", flex:1, maxWidth:280 }}>
              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:12 }}>🔍</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads…" style={{ width:"100%", padding:"8px 12px 8px 30px", borderRadius:8, border:"1.5px solid #E2E8F0", fontSize:13, fontFamily:"inherit", outline:"none", color:"#0F172A" }} />
            </div>
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
                    const isRenaming = renamingId === lead.id;
                    return (
                      <tr key={lead.id} style={{ borderBottom:"1px solid #F1F5F9", background:isPending?"#FFFBEB":"#fff", transition:"background .1s" }}>
                        <td style={{ padding:"12px 16px" }}>
                          {isRenaming ? (
                            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                              <input
                                autoFocus
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") saveName(lead.id);
                                  if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                                }}
                                style={{ padding:"5px 8px", borderRadius:6, border:`1.5px solid ${C.accent}`, fontSize:13, fontFamily:"inherit", outline:"none", width:160, color:"#0F172A" }}
                              />
                              <button onClick={() => saveName(lead.id)} style={{ padding:"4px 8px", borderRadius:6, border:"none", background:C.accent, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>✓</button>
                              <button onClick={() => { setRenamingId(null); setRenameValue(""); }} style={{ padding:"4px 6px", borderRadius:6, border:"1.5px solid #E2E8F0", background:"#fff", color:C.muted, fontSize:11, cursor:"pointer" }}>✕</button>
                            </div>
                          ) : (
                            <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                              {isPending && <span style={{ width:7, height:7, borderRadius:"50%", background:C.red, display:"inline-block", animation:"livePulse 1.5s infinite", flexShrink:0 }} />}
                              <span onClick={() => openPanel(lead)} style={{ fontWeight:700, color:C.blue, cursor:"pointer" }}>{lead.name}</span>
                              <span onClick={() => openPanel(lead)} style={{ fontSize:10, background:C.accentBg, color:C.accentText, padding:"1px 6px", borderRadius:4, fontWeight:600, cursor:"pointer" }}>Reply</span>
                              <button
                                onClick={() => { setRenamingId(lead.id); setRenameValue(lead.name); }}
                                style={{ border:"none", background:"none", cursor:"pointer", fontSize:11, color:"#94A3B8", padding:0, flexShrink:0 }}
                                title="I-rename ang lead">✏️</button>
                            </span>
                          )}
                        </td>
                        <td style={{ padding:"12px 16px", color:C.muted, fontSize:13 }}>{lead.email||"—"}</td>
                        <td style={{ padding:"12px 16px" }}>{pill(C.blueBg, C.blue, <>📘 {lead.source}</>)}</td>
                        {showCommentCols && <td style={{ padding:"12px 16px", fontSize:12, color:"#555", maxWidth:160 }}>{lead.postTitle||"—"}</td>}
                        {showCommentCols && <td style={{ padding:"12px 16px", fontSize:12, color:"#333", maxWidth:180 }}>{lead.comment||"—"}</td>}
                        <td style={{ padding:"12px 16px", fontSize:12, color:"#475569" }}>{stage}</td>
                        <td style={{ padding:"12px 16px" }}>{pill(heatCfg.bg, heatCfg.color, <>{heatCfg.icon} {lead.heat}</>)}</td>
                        <td style={{ padding:"12px 16px" }}>
                          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                            <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:status.bg, color:status.color, padding:"4px 10px", borderRadius:999, fontSize:11, fontWeight:700, width:"fit-content" }}>
                              {dot(status.color)} {status.label}
                            </span>
                            {status.noReplyFrom && (
                              <span style={{ fontSize:10, color:C.muted }}>😴 Walang tugon si customer ({timeSince(status.noReplyFrom)})</span>
                            )}
                            {status.since && (
                              <span style={{ fontSize:10, color:C.red, fontWeight:600 }}>⏰ Nag-message {timeSince(status.since)} ago</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding:"12px 16px", fontSize:12, color:C.muted, whiteSpace:"nowrap" }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding:"12px 16px" }}>
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                            <button onClick={() => setPaymentLead(lead)} style={{ padding:"5px 12px", fontSize:11, fontWeight:700, borderRadius:7, border:"1.5px solid #C7D2FE", background:"#EEF2FF", color:C.accentText, cursor:"pointer", minWidth:90 }}>
                              💰 Payment
                            </button>
                            {!isDone ? (
                              <button onClick={() => markAsDone(lead.id, lead.source)} disabled={isUpdating} style={{ padding:"5px 12px", fontSize:11, fontWeight:700, borderRadius:7, border:"1.5px solid #BBF7D0", background:isUpdating?"#F1F5F9":"#F0FDF4", color:isUpdating?C.muted:C.green, cursor:isUpdating?"not-allowed":"pointer", minWidth:90 }}>
                                {isUpdating ? "Saving…" : "✓ Mark Done"}
                              </button>
                            ) : (
                              <button onClick={() => markAsActive(lead.id)} disabled={isUpdating} style={{ padding:"5px 12px", fontSize:11, fontWeight:700, borderRadius:7, border:"1.5px solid #E2E8F0", background:"#F1F5F9", color:C.muted, cursor:isUpdating?"not-allowed":"pointer", minWidth:90 }}>
                                {isUpdating ? "Saving…" : "↩ Reopen"}
                              </button>
                            )}
                          </div>
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
      />

      {paymentLead && (
        <PaymentModal
          lead={paymentLead}
          onClose={() => setPaymentLead(null)}
          onSaved={handlePaymentSaved}
        />
      )}

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
