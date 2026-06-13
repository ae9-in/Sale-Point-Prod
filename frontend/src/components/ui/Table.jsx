import { cn } from '../../utils/cn';

export const Table = ({ children, className }) => (
  <div className="overflow-x-auto w-full">
    <table className={cn("w-full text-left text-xs text-content-secondary md:text-sm", className)}>
      {children}
    </table>
  </div>
);

export const Thead = ({ children }) => (
  <thead className="text-[11px] text-content-secondary uppercase tracking-wide bg-dark-bg/60 border-b border-dark-border">
    {children}
  </thead>
);

export const Tbody = ({ children }) => (
  <tbody>{children}</tbody>
);

export const Tr = ({ children, className }) => (
  <tr className={cn("border-b border-dark-border hover:bg-brand-primary/5 transition-colors", className)}>
    {children}
  </tr>
);

export const Th = ({ children, className }) => (
  <th scope="col" className={cn("px-4 py-3 font-semibold", className)}>
    {children}
  </th>
);

export const Td = ({ children, className }) => (
  <td className={cn("px-4 py-3", className)}>
    {children}
  </td>
);
