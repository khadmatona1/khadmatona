<?php

namespace App\Modules\Lead\Domain\Enums;

enum LeadStatus: string
{
    case New = 'new';
    case Contacted = 'contacted';
    case ToCallBack = 'to_call_back';
    case Visit = 'visit';
    case Negotiation = 'negotiation';
    case Closed = 'closed';
}
