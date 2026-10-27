export const ROLE_ID = { ADMIN: 1, FARMER: 2, PROCESSOR: 3, DISTRIBUTOR: 4, RETAILER: 5, CUSTOMER: 6 };
export const STATUSES = ["CREATED", "PROCESSED", "IN_DISTRIBUTION", "AT_RETAILER", "SOLD", "RECALLED"];
export const STAGE_STEPS = [
  { key: "CREATED", label: "Farm", note: "Harvested & registered" },
  { key: "PROCESSED", label: "Processing", note: "Cleaned & packed" },
  { key: "IN_DISTRIBUTION", label: "Transport", note: "On the road" },
  { key: "AT_RETAILER", label: "Retail", note: "On the shelf" },
  { key: "SOLD", label: "Sold", note: "With the customer" },
];
export const STATUS_LABEL = {
  CREATED: "At farm", PROCESSED: "Processed", IN_DISTRIBUTION: "In transport",
  AT_RETAILER: "At retailer", SOLD: "Sold", RECALLED: "Recalled",
};
export const STATUS_TO_STAGE = { CREATED: 0, PROCESSED: 1, IN_DISTRIBUTION: 2, AT_RETAILER: 3, SOLD: 4, RECALLED: 5 };
export const ROLE_COLOR = {
  ADMIN: "#3A5BD9", FARMER: "#12A072", PROCESSOR: "#E07A1F", DISTRIBUTOR: "#8A4FD6", RETAILER: "#D9484F", CUSTOMER: "#0E8FA8",
};
export const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "-");
export const fmtDate = (ts) =>
  ts ? new Date(ts * 1000).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
