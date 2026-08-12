'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const Select = ({ value, onValueChange, children, ...props }: any) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(value);
  const selectRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (itemValue: string) => {
    setSelectedValue(itemValue);
    setIsOpen(false);
    if (onValueChange) {
      onValueChange(itemValue);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={selectRef}>
      <div>
        <button
          type="button"
          className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          id="menu-button"
          aria-expanded={isOpen}
          aria-haspopup="true"
          onClick={() => setIsOpen(!isOpen)}
        >
          {children?.props?.children || selectedValue}
          <svg
            className="-mr-1 h-5 w-5 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
          aria-hidden={!isOpen}
        >
          <div className="py-1" role="none">
            {React.Children.map(children, (child: any) => {
              if (!React.isValidElement(child)) return null;
              return React.cloneElement(child as React.ReactElement<any>, {
                onClick: () => handleSelect((child as any).props.value),
                className: cn(
                  (child as any).props.className,
                  'text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900 cursor-pointer'
                ),
              });
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const SelectTrigger = ({ className, children, ...props }: any) => {
  return (
    <div className={cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}>
      {children}
    </div>
  );
};

const SelectValue = ({ className, ...props }: any) => {
  return <span className={cn('block truncate', className)} {...props} />;
};

const SelectContent = ({ className, children, ...props }: any) => {
  return (
    <div className={cn('relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2', className)} {...props}>
      {children}
    </div>
  );
};

const SelectItem = ({ className, children, ...props }: any) => {
  return (
    <div
      className={cn('relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)}
      {...props}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <svg className="h-4 w-4 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>

      {children}
    </div>
  );
};

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };