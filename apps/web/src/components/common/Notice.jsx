import Icon from "./Icon";
export default function Notice({children,warning=false}) {
  return <div className={`notice ${warning ? "warning" : ""}`}><Icon name={warning ? "TriangleAlert" : "Info"}/><div>{children}</div></div>;
}
