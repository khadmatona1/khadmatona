<?php

namespace App\Modules\Rental\Domain\Enums;

/**
 * Cleaning and maintenance have their own tables; these are every other cost.
 */
enum ExpenseCategory: string
{
    case Utilities = 'utilities';
    case Supplies = 'supplies';
    case Repairs = 'repairs';
    case Taxes = 'taxes';
    case Insurance = 'insurance';
    case Commission = 'commission';
    case Other = 'other';
}
