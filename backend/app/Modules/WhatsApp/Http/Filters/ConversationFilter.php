<?php

namespace App\Modules\WhatsApp\Http\Filters;

use App\Core\Support\QueryFilters\BaseQueryFilter;
use App\Modules\WhatsApp\Domain\Models\Conversation;
use Illuminate\Database\Eloquent\Builder;
use Spatie\QueryBuilder\AllowedFilter;

class ConversationFilter extends BaseQueryFilter
{
    protected function subject(): Builder
    {
        $query = Conversation::query();

        // Admin sees every thread; a Commercial/SeniorCommercial only the
        // ones assigned to them. The last branch is defense-in-depth - every
        // route using this filter already requires one of those roles.
        $user = $this->request->user();

        if ($user?->hasRole('Admin')) {
            return $query;
        }

        if ($user?->hasAnyRole(['Commercial', 'SeniorCommercial'])) {
            return $query->where('assigned_user_id', $user->id);
        }

        return $query->whereRaw('1 = 0');
    }

    /**
     * @return array<int, string|AllowedFilter>
     */
    protected function allowedFilters(): array
    {
        return [
            'lead_id',
            'contact_id',
            'assigned_user_id',
            AllowedFilter::callback('unread', function ($query, $value) {
                if (filter_var($value, FILTER_VALIDATE_BOOLEAN)) {
                    $query->where('unread_count', '>', 0);
                }
            }),
            AllowedFilter::callback('search', function ($query, $value) {
                $query->where(function ($query) use ($value) {
                    $query->where('contact_name', 'like', "%{$value}%")
                        ->orWhere('phone', 'like', "%{$value}%")
                        ->orWhere('wa_id', 'like', "%{$value}%");
                });
            }),
        ];
    }

    /**
     * @return array<int, string>
     */
    protected function allowedSorts(): array
    {
        return ['last_message_at', 'created_at'];
    }
}
