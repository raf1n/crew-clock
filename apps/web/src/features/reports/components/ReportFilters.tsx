import { REPORT_GROUP_BYS, type ReportGroupBy } from '@crewclock/shared';

import { FormField } from '@/components/shared/FormField';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatLabel } from '@/lib/format';

export function ReportFilters({
  from,
  to,
  groupBy,
  isManager,
  onFromChange,
  onToChange,
  onGroupByChange,
}: {
  from: string;
  to: string;
  groupBy: ReportGroupBy;
  isManager: boolean;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onGroupByChange: (value: ReportGroupBy) => void;
}) {
  const groupByOptions = isManager
    ? REPORT_GROUP_BYS
    : REPORT_GROUP_BYS.filter((option) => option !== 'user');

  return (
    <Card className="gap-0 py-4">
      <div className="grid gap-3 px-4 sm:grid-cols-3">
        <FormField label="From">
          <Input type="date" value={from} onChange={(event) => onFromChange(event.target.value)} />
        </FormField>
        <FormField label="To">
          <Input type="date" value={to} onChange={(event) => onToChange(event.target.value)} />
        </FormField>
        <FormField label="Group by">
          <Select
            value={groupBy}
            onValueChange={(value) => onGroupByChange(value as ReportGroupBy)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groupByOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {formatLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
    </Card>
  );
}
