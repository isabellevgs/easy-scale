import { describeConsistencyRule } from "../lib/consistencyRules";

export default function ConsistencyRuleTitle({ rule, shiftsById, className = "" }) {
  const meta = describeConsistencyRule(rule, shiftsById);
  const { titleParts } = meta;

  if (!titleParts?.highlight) {
    return <span className={className}>{meta.title}</span>;
  }

  return (
    <span className={className}>
      {titleParts.before}
      <span className="text-brand">{titleParts.highlight}</span>
      {titleParts.after}
    </span>
  );
}
