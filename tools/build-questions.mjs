// Parses the legacy "Net + Day N.html" quiz files, normalizes their wildly
// different embedded data formats into one schema, tags every question with
// a CompTIA Network+ (N10-009) domain/objective, and writes assets/questions.js.
//
// Run with: node tools/build-questions.mjs

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const VAR_NAMES = ["sourceQuestions", "RAW_QUESTIONS", "QUESTIONS", "questions"];

// ---------------------------------------------------------------------------
// 1. Extract the raw array literal text for each file's question bank.
// ---------------------------------------------------------------------------

function findArrayLiteral(text, varName) {
  const re = new RegExp(`(?:const|var|let)\\s+${varName}\\s*=\\s*(?:shuffle\\()?\\s*\\[`, "g");
  const m = re.exec(text);
  if (!m) return null;
  const start = text.indexOf("[", m.index);
  let depth = 0;
  let inStr = null;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function extractRaw(file) {
  const text = readFileSync(path.join(ROOT, file), "utf8");
  for (const varName of VAR_NAMES) {
    const lit = findArrayLiteral(text, varName);
    if (lit) {
      // eslint-disable-next-line no-new-func
      const arr = new Function(`return (${lit});`)();
      if (Array.isArray(arr) && arr.length) return arr;
    }
  }
  throw new Error(`No question array found in ${file}`);
}

// ---------------------------------------------------------------------------
// 2. Per-file adapters -> common shape:
//    { question, options: [string,4], correctIndex, explanation, optionExplanations?, tag? }
// ---------------------------------------------------------------------------

function letterToIndex(label) {
  return { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 }[String(label).trim().toUpperCase()] ?? 0;
}

function adaptItem(raw) {
  // Shape: { question, options[], correctIndex, explanation, topic }
  if (raw.question !== undefined && Array.isArray(raw.options) && raw.correctIndex !== undefined) {
    return {
      question: raw.question,
      options: raw.options,
      correctIndex: raw.correctIndex,
      explanation: raw.explanation || "",
      tag: raw.topic || raw.category || null,
    };
  }
  // Shape: { q, a[], c, e }
  if (raw.q !== undefined && Array.isArray(raw.a) && raw.c !== undefined) {
    return {
      question: raw.q,
      options: raw.a,
      correctIndex: raw.c,
      explanation: raw.e || "",
      tag: raw.topic || raw.category || null,
    };
  }
  // Shape: { q, choices[], correct, exp, choiceExps? }
  if (raw.q !== undefined && Array.isArray(raw.choices) && raw.correct !== undefined) {
    return {
      question: raw.q,
      options: raw.choices,
      correctIndex: raw.correct,
      explanation: raw.exp || "",
      optionExplanations: Array.isArray(raw.choiceExps) ? raw.choiceExps : null,
      tag: raw.topic || raw.category || null,
    };
  }
  // Shape: { category, question, answers:[{label,text}], correctLabel, explanation }
  if (raw.question !== undefined && Array.isArray(raw.answers) && raw.answers[0]?.text !== undefined && raw.correctLabel !== undefined) {
    return {
      question: raw.question,
      options: raw.answers.map((a) => a.text),
      correctIndex: letterToIndex(raw.correctLabel),
      explanation: raw.explanation || "",
      tag: raw.category || null,
    };
  }
  // Shape: { q, answers:[{text, correct}], explanation }
  if (raw.q !== undefined && Array.isArray(raw.answers) && raw.answers[0]?.correct !== undefined) {
    return {
      question: raw.q,
      options: raw.answers.map((a) => a.text),
      correctIndex: raw.answers.findIndex((a) => a.correct),
      explanation: raw.explanation || "",
      tag: raw.topic || raw.category || null,
    };
  }
  // Shape: { Question, Options[], Answer:[idx], Explanation }
  if (raw.Question !== undefined && Array.isArray(raw.Options) && Array.isArray(raw.Answer)) {
    return {
      question: raw.Question,
      options: raw.Options,
      correctIndex: raw.Answer[0],
      explanation: raw.Explanation || "",
      tag: raw.topic || raw.category || null,
    };
  }
  throw new Error(`Unrecognized question shape: ${JSON.stringify(raw).slice(0, 120)}`);
}

// ---------------------------------------------------------------------------
// 3. CompTIA Network+ (N10-009) objective taxonomy + classifier.
//    This is an original study-aid grouping inspired by the public N10-009
//    exam domain structure; it is not official CompTIA material.
// ---------------------------------------------------------------------------

export const OBJECTIVES = [
  { id: "1.1", domain: "1.0 Networking Concepts", label: "OSI Model & Networking Concepts" },
  { id: "1.2", domain: "1.0 Networking Concepts", label: "Networking Appliances & Applications" },
  { id: "1.3", domain: "1.0 Networking Concepts", label: "Cloud Concepts & Virtualization" },
  { id: "1.4", domain: "1.0 Networking Concepts", label: "Ports, Protocols, Services & Traffic Types" },
  { id: "1.5", domain: "1.0 Networking Concepts", label: "Transmission Media & Transceivers" },
  { id: "1.6", domain: "1.0 Networking Concepts", label: "Network Topologies & Architectures" },
  { id: "2.1", domain: "2.0 Network Implementation", label: "Routing Technologies" },
  { id: "2.2", domain: "2.0 Network Implementation", label: "Switching Technologies" },
  { id: "2.3", domain: "2.0 Network Implementation", label: "Wireless Technologies" },
  { id: "2.4", domain: "2.0 Network Implementation", label: "Physical Installations & Cabling" },
  { id: "2.5", domain: "2.0 Network Implementation", label: "IP Addressing & Network Services" },
  { id: "3.1", domain: "3.0 Network Operations", label: "Network Monitoring" },
  { id: "3.2", domain: "3.0 Network Operations", label: "High Availability & Disaster Recovery" },
  { id: "3.3", domain: "3.0 Network Operations", label: "Organizational Documents & Policies" },
  { id: "4.1", domain: "4.0 Network Security", label: "Security Concepts & Segmentation" },
  { id: "4.2", domain: "4.0 Network Security", label: "Common Attacks & Threats" },
  { id: "4.3", domain: "4.0 Network Security", label: "Security Features & Access Control" },
  { id: "4.4", domain: "4.0 Network Security", label: "Authentication, Remote Access & VPN" },
  { id: "5.1", domain: "5.0 Network Troubleshooting", label: "Troubleshooting Methodology" },
  { id: "5.2", domain: "5.0 Network Troubleshooting", label: "Cabling & Physical Interface Issues" },
  { id: "5.3", domain: "5.0 Network Troubleshooting", label: "Network Service Issues" },
  { id: "5.4", domain: "5.0 Network Troubleshooting", label: "Performance & Wireless Issues" },
  { id: "5.5", domain: "5.0 Network Troubleshooting", label: "Troubleshooting Tools & Commands" },
];

const TAG_MAP = {
  "topology": "1.6", "topology/osi": "1.1", "osi": "1.1",
  "appliances": "1.2", "cabling": "2.4", "installation": "2.4",
  "cloud access": "1.3", "cloud concepts": "1.3", "cloud connectivity": "1.3", "cloud cost": "1.3",
  "cloud deployment": "1.3", "cloud management": "1.3", "cloud migration": "1.3", "cloud networking": "1.3",
  "cloud performance": "1.3", "cloud security": "4.3", "cloud service models": "1.3", "cloud storage": "1.3",
  "high availability": "3.2", "virtualization": "1.3",
  "authentication & access": "4.4", "cloud & connectivity": "1.3", "cloud & edge": "1.3",
  "cloud & virtualization": "1.3", "internet protocol (ip) addressing": "2.5",
  "monitoring & management": "3.1", "network design": "1.6", "network policies": "3.3",
  "network services": "2.5", "open systems interconnection (osi) model": "1.1", "physical layer": "2.4",
  "ports & protocols": "1.4", "routing": "2.1", "security": "4.1", "switching": "2.2",
  "troubleshooting": "5.1", "wireless": "2.3", "wireless design": "2.3",
  "virtual private network (vpn) & remote access": "4.4",
};

// Ordered keyword rules for questions with no explicit tag. First match wins.
const KEYWORD_RULES = [
  ["5.5", /\b(ping|traceroute|tracert|pathping|nslookup|dig|netstat|arp -a|ipconfig|show mac|show interface|cable tester|tone generator|otdr|loopback adapter|packet sniffer|protocol analyzer|nmap|wireshark)\b/i],
  ["5.2", /\b(attenuation|crosstalk|tx\/rx|split pair|open\/short|db loss|decibel loss|wrong pinout|termination|crc error|runts?|giants?|interface error|duplex mismatch)\b/i],
  ["5.4", /\b(latency|jitter|bottleneck|bandwidth saturation|channel overlap|co-channel|rssi|signal strength|interference|throughput)\b/i],
  ["5.3", /\b(troubleshoot|misconfigur|scope exhaustion|apipa|wrong dns|nxdomain|blacklist|wrong gateway)\b/i],
  ["5.1", /\b(troubleshooting methodology|establish a theory|escalate|root cause|divide and conquer)\b/i],
  ["4.2", /\b(spoofing|poisoning|on-path|man-in-the-middle|denial of service|dos attack|ddos|syn flood|brute force|phishing|malware|ransomware|rogue (ap|dhcp)|evil twin|deauthentication|social engineering|vlan hopping)\b/i],
  ["4.4", /\b(vpn|remote access|radius|tacacs\+|802\.1x|multi-?factor|mfa|sso|single sign-on|ldap|kerberos|certificate-based auth|aaa)\b/i],
  ["4.3", /\b(firewall|access control list|\bacl\b|ids\b|ips\b|dmz|nac\b|port security|honeypot|screened subnet)\b/i],
  ["4.1", /\b(segmentation|zero trust|defense in depth|least privilege|attack surface|risk|vulnerability|confidentiality|integrity|availability)\b/i],
  ["2.3", /\b(wireless|wi-?fi|access point|ssid|antenna|channel width|wpa|ap placement|site survey|ad hoc|mimo|beamforming|omnidirectional|yagi)\b/i],
  ["2.4", /\b(fiber|patch panel|punch.?down|rj-?45|rj-?11|connector|utp|stp|cat ?[56]|cabling|rack|demarc|cross-?connect|110 block)\b/i],
  ["2.2", /\b(vlan|trunk|802\.1q|spanning tree|link aggregation|port mirror|switch(ing)?|inter-vlan)\b/i],
  ["2.1", /\b(routing|routed|route table|static route|default gateway|ospf|eigrp|bgp|rip\b|administrative distance|routing loop)\b/i],
  ["2.5", /\b(dhcp|dns\b|apipa|ntp\b|subnet(ting)?|cidr|ip address(ing)?|ipv4|ipv6|scope|lease time|dns record|ptr record|a record|cname)\b/i],
  ["1.3", /\b(cloud|saas|paas|iaas|faas|virtualization|hypervisor|multi-?tenan|elasticity|edge computing|containeriz)\b/i],
  ["1.2", /\b(load balancer|proxy|ids\/ips|controller|repeater|hub\b|gateway appliance|voip pbx)\b/i],
  ["1.4", /\b(port \d|well-known port|tcp\b|udp\b|http|ftp|smtp|snmp|syslog|ssh\b|telnet|traffic type)\b/i],
  ["1.6", /\b(star topology|mesh topology|bus topology|ring topology|hybrid topology|point-to-point|point-to-multipoint|hub.and.spoke)\b/i],
  ["1.1", /\b(osi|layer [1-7]|data link|physical layer|transport layer|application layer|session layer|presentation layer)\b/i],
  ["3.1", /\b(snmp|syslog|netflow|baseline|threshold alert|packet capture|flow data|log aggregation)\b/i],
  ["3.2", /\b(disaster recovery|redundan|failover|high availability|backup|business continuity|mtbf|mttr|rpo|rto)\b/i],
  ["3.3", /\b(sla\b|aup\b|mou\b|nda\b|standard operating procedure|change management|documentation|wiring diagram|baseline configuration)\b/i],
];

const FILE_DEFAULTS = {
  "Net + Day 1.html": "1.1",
  "Net + Day 2.html": "1.2",
  "Net + Day 3 .html": "1.2",
  "Net + Day 4 .html": "2.5",
  "Net + Day 5 .html": "1.2",
  "Net + Day 6 .html": "1.4",
  "Net + Day 7 .html": "2.5",
  "Net + Day 8.html": "3.1",
  "Net + Day 9_hardened_distractors.html": "4.2",
  "Net + Day 10_hardened_instant_feedback.html": "4.2",
  "Net + Day 11.html": "3.1",
  "Net + Day 12 .html": "2.3",
  "Net + Day 13.html": "1.3",
  "Net + Day 14.html": "1.3",
  "Net + Review.html": "1.1",
  "Net + Review 2.html": "5.1",
};

function classify(item, file) {
  if (item.tag) {
    const key = String(item.tag).trim().toLowerCase();
    if (TAG_MAP[key]) return TAG_MAP[key];
  }
  const haystack = `${item.question} ${item.options.join(" ")} ${item.explanation}`;
  for (const [objId, re] of KEYWORD_RULES) {
    if (re.test(haystack)) return objId;
  }
  return FILE_DEFAULTS[file] || "1.1";
}

// ---------------------------------------------------------------------------
// 4. Main
// ---------------------------------------------------------------------------

function main() {
  const files = readdirSync(ROOT).filter((f) => f.startsWith("Net + ") && f.endsWith(".html"));
  const bank = [];
  const seen = new Set();
  let skippedShapes = [];

  for (const file of files) {
    let rawItems;
    try {
      rawItems = extractRaw(file);
    } catch (err) {
      console.error(`SKIP FILE ${file}: ${err.message}`);
      continue;
    }
    for (const raw of rawItems) {
      let item;
      try {
        item = adaptItem(raw);
      } catch (err) {
        skippedShapes.push(`${file}: ${err.message}`);
        continue;
      }
      if (!item.question || !Array.isArray(item.options) || item.options.length < 2) continue;
      const dedupeKey = item.question.trim().toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const objectiveId = classify(item, file);
      const objective = OBJECTIVES.find((o) => o.id === objectiveId);
      // Only persist optionExplanations when the source file provided real,
      // option-specific text (e.g. Day 7's choiceExps). Otherwise the client
      // synthesizes an equivalent "why this is wrong" line at render time
      // from `explanation`, which keeps the generated data file far smaller.
      const hasCustomOptionExplanations =
        Array.isArray(item.optionExplanations) &&
        item.optionExplanations.length === item.options.length;

      const entry = {
        id: bank.length + 1,
        question: item.question.trim(),
        options: item.options,
        correctIndex: item.correctIndex,
        explanation: item.explanation || item.options[item.correctIndex],
        domain: objective.domain,
        objectiveId: objective.id,
        objective: objective.label,
        source: file,
      };
      if (hasCustomOptionExplanations) {
        entry.optionExplanations = item.optionExplanations;
      }
      bank.push(entry);
    }
  }

  if (skippedShapes.length) {
    console.error(`Skipped ${skippedShapes.length} unrecognized items:`);
    skippedShapes.slice(0, 10).forEach((s) => console.error("  " + s));
  }

  // Summary
  const byObjective = {};
  for (const q of bank) byObjective[q.objectiveId] = (byObjective[q.objectiveId] || 0) + 1;
  console.log(`Total questions: ${bank.length}`);
  for (const obj of OBJECTIVES) {
    console.log(`  ${obj.id} ${obj.label.padEnd(40)} ${byObjective[obj.id] || 0}`);
  }

  const out = `// AUTO-GENERATED by tools/build-questions.mjs — do not hand-edit.
// Regenerate with: node tools/build-questions.mjs
window.OBJECTIVES = ${JSON.stringify(OBJECTIVES)};
window.QUESTION_BANK = ${JSON.stringify(bank)};
`;
  writeFileSync(path.join(ROOT, "assets", "questions.js"), out);
  console.log(`\nWrote assets/questions.js (${bank.length} questions).`);
}

main();
