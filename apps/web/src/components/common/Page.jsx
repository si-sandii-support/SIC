export default function Page({children,narrow=false}) {
  return <div className={`page ${narrow ? "narrow" : ""}`}><div className="container">{children}</div></div>;
}
