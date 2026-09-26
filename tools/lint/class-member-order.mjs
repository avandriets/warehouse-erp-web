const lifecycleHooks = ['ngOnChanges', 'ngOnInit', 'ngDoCheck', 'ngAfterContentInit', 'ngAfterContentChecked', 'ngAfterViewInit', 'ngAfterViewChecked', 'ngOnDestroy'];

const lifecycleRanks = new Map(lifecycleHooks.map((name, index) => [name, index]));

const groups = [
  'injected members',
  'inputs',
  'outputs',
  'private fields',
  'protected fields',
  'public fields',
  'constructor',
  'getters and setters',
  'Angular lifecycle hooks',
  'public methods',
  'protected methods',
  'private methods',
];

function memberName(member) {
  if (member.key?.type === 'Identifier' || member.key?.type === 'PrivateIdentifier') return member.key.name;
  if (member.key?.type === 'Literal' && typeof member.key.value === 'string') return member.key.value;

  return null;
}

function accessibility(member) {
  if (member.key?.type === 'PrivateIdentifier') return 'private';

  return member.accessibility ?? 'public';
}

function unwrapExpression(expression) {
  let current = expression;
  while (['ChainExpression', 'TSAsExpression', 'TSNonNullExpression', 'TSTypeAssertion'].includes(current?.type)) current = current.expression;

  return current;
}

function calledFactory(member) {
  const value = unwrapExpression(member.value);
  if (value?.type !== 'CallExpression') return null;
  const callee = unwrapExpression(value.callee);
  if (callee?.type === 'Identifier') return callee.name;
  if (callee?.type === 'MemberExpression') {
    const object = unwrapExpression(callee.object);
    if (object?.type === 'Identifier') return object.name;
  }

  return null;
}

function decoratorName(decorator) {
  const expression = unwrapExpression(decorator.expression);
  const target = expression?.type === 'CallExpression' ? unwrapExpression(expression.callee) : expression;

  return target?.type === 'Identifier' ? target.name : null;
}

function hasDecorator(member, name) {
  return member.decorators?.some(decorator => decoratorName(decorator) === name) ?? false;
}

function fieldGroup(member) {
  const factory = calledFactory(member);
  if (factory === 'inject') return 0;
  if (factory === 'input' || factory === 'model' || hasDecorator(member, 'Input')) return 1;
  if (factory === 'output' || factory === 'outputFromObservable' || hasDecorator(member, 'Output')) return 2;

  const visibility = accessibility(member);
  if (visibility === 'private') return 3;
  if (visibility === 'protected') return 4;

  return 5;
}

function methodGroup(member) {
  if (member.kind === 'constructor') return { group: 6, detail: 0 };
  if (member.kind === 'get' || member.kind === 'set') return { group: 7, detail: 0 };

  const name = memberName(member);
  const lifecycleRank = lifecycleRanks.get(name);
  if (lifecycleRank !== undefined) return { group: 8, detail: lifecycleRank };

  const visibility = accessibility(member);
  if (visibility === 'protected') return { group: 10, detail: 0 };
  if (visibility === 'private') return { group: 11, detail: 0 };

  return { group: 9, detail: 0 };
}

function classify(member) {
  if (['PropertyDefinition', 'TSAbstractPropertyDefinition'].includes(member.type)) return { group: fieldGroup(member), detail: 0 };
  if (['MethodDefinition', 'TSAbstractMethodDefinition'].includes(member.type)) return methodGroup(member);

  return null;
}

export const classMemberOrder = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce the Warehouse ERP class member order.',
    },
    schema: [],
    messages: {
      wrongOrder: 'Move {{member}} before {{previousGroup}}. Expected class order: {{order}}.',
      wrongLifecycleOrder: 'Move {{member}} before {{previousHook}} to match the Angular lifecycle order.',
    },
  },
  create(context) {
    function checkClass(node) {
      let highestGroup = -1;
      let highestGroupName = '';
      let previousLifecycleRank = -1;
      let previousLifecycleName = '';

      for (const member of node.body.body) {
        const classification = classify(member);
        if (!classification) continue;
        const name = memberName(member) ?? groups[classification.group];

        if (classification.group < highestGroup) {
          context.report({
            node: member,
            messageId: 'wrongOrder',
            data: {
              member: `\`${name}\``,
              previousGroup: highestGroupName,
              order: groups.join(' → '),
            },
          });
          continue;
        }

        if (classification.group === 8) {
          if (classification.detail < previousLifecycleRank) {
            context.report({
              node: member,
              messageId: 'wrongLifecycleOrder',
              data: { member: `\`${name}\``, previousHook: `\`${previousLifecycleName}\`` },
            });
            continue;
          }
          previousLifecycleRank = classification.detail;
          previousLifecycleName = name;
        }

        if (classification.group > highestGroup) {
          highestGroup = classification.group;
          highestGroupName = groups[classification.group];
        }
      }
    }

    return {
      ClassDeclaration: checkClass,
      ClassExpression: checkClass,
    };
  },
};
