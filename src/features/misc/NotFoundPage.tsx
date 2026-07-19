import { useNavigate } from 'react-router';
import { Compass } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="p-8 max-w-[720px] w-full mx-auto">
      <EmptyState
        icon={<Compass size={30} aria-hidden />}
        title="الصفحة غير موجودة"
        description="الرابط الذي فتحته غير صحيح أو أن العنصر حُذف."
        actions={
          <Button onClick={() => navigate('/')} variant="neutral">
            العودة إلى لوحة التحكم
          </Button>
        }
      />
    </div>
  );
}
