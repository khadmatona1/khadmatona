const fs=require('fs');const root='B:/KHADMATONA-/';function edit(p,from,to){const path=root+p;let s=fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n');if(!s.includes(from))throw new Error(p+' '+from);fs.writeFileSync(path,s.replace(from,to));}
edit('backend/app/Modules/PropertyAlert/Domain/Models/PropertyAlert.php',"        'property_type',","        'property_type',\n        'transaction_type',\n        'price_period',");
edit('backend/app/Modules/PropertyAlert/Http/Requests/StorePropertyAlertRequest.php',"            'budget_max' =>", "            'transaction_type' => ['nullable', Rule::in(['sale', 'rent'])],\n            'price_period' => ['nullable', 'prohibited_unless:transaction_type,rent', Rule::in(['month', 'night'])],\n            'budget_max' =>");
edit('backend/app/Modules/PropertyAlert/Application/Actions/CreatePropertyAlertAction.php','        ksort($criteria);',`        // Omit unset new keys to preserve fingerprints of existing subscriptions.
        foreach (['transaction_type', 'price_period'] as $key) {
            if (isset($validated[$key])) {
                $criteria[$key] = $validated[$key];
            }
        }
        ksort($criteria);`);
edit('backend/app/Modules/PropertyAlert/Application/PropertyAlertMatcher.php',"            ->where(fn ($q) => $q->whereNull('budget_max')", "            ->where(fn ($q) => $q->whereNull('transaction_type')->orWhere('transaction_type', $property->transaction_type))\n            ->where(fn ($q) => $q->whereNull('price_period')->orWhere('price_period', $property->price_period))\n            ->where(fn ($q) => $q->whereNull('budget_max')");
edit('backend/app/Modules/PropertyAlert/Http/Resources/PropertyAlertResource.php',"            'property_type' =>", "            'transaction_type' => $this->transaction_type,\n            'price_period' => $this->price_period,\n            'property_type' =>");
edit('frontend/admin/src/types/property-alert.ts','  phone: string;','  phone: string;\n  transactionType?: "sale" | "rent";\n  pricePeriod?: "month" | "night";');
edit('frontend/admin/src/lib/property-alerts.ts','  if (payload.email?.trim())', '  if (payload.transactionType) body.transaction_type = payload.transactionType;\n  if (payload.pricePeriod) body.price_period = payload.pricePeriod;\n  if (payload.email?.trim())');
edit('frontend/admin/src/components/properties/property-alert-form.tsx','    if (filters.cityId)', '    if (filters.transactionType) payload.transactionType = filters.transactionType;\n    if (filters.pricePeriod) payload.pricePeriod = filters.pricePeriod;\n    if (filters.cityId)');
edit('frontend/admin/src/components/properties/properties-list.tsx','      {!filters.transactionType && !filters.pricePeriod && (\n        <PropertyAlertCta filters={filters} />\n      )}', '      <PropertyAlertCta filters={filters} />');
console.log('Alert criteria integrated');
