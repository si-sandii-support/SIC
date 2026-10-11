export default function SectionHead({kicker,title,text}) {
  return <div className="section-head"><div className="eyebrow">{kicker}</div><h2>{title}</h2>{text && <p>{text}</p>}</div>;
}
