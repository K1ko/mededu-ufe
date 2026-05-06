# kcrp-mededu-training-list



<!-- Auto Generated Below -->


## Properties

| Property           | Attribute            | Description | Type                 | Default |
| ------------------ | -------------------- | ----------- | -------------------- | ------- |
| `apiBase`          | `api-base`           |             | `string`             | `''`    |
| `createHref`       | `create-href`        |             | `string`             | `''`    |
| `trainingHrefBase` | `training-href-base` |             | `string`             | `''`    |
| `userRole`         | `user-role`          |             | `"employee" \| "hr"` | `'hr'`  |


## Events

| Event                     | Description | Type                  |
| ------------------------- | ----------- | --------------------- |
| `training-clicked`        |             | `CustomEvent<string>` |
| `training-create-clicked` |             | `CustomEvent<void>`   |


## Dependencies

### Used by

 - [kcrp-mededu-trainings-app](../kcrp-mededu-trainings-app)

### Graph
```mermaid
graph TD;
  kcrp-mededu-trainings-app --> kcrp-mededu-training-list
  style kcrp-mededu-training-list fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
