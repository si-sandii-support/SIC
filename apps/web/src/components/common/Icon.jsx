import * as Icons from "lucide-react";
export default function Icon({name,...props}) {
  const Component = Icons[name] || Icons.Circle;
  return <Component {...props}/>;
}
